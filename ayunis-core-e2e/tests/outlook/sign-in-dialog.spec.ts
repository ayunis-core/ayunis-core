import { login, registerOrg, confirmEmail } from '../../src/clients/api/auth.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { enableTotp } from '../../src/clients/api/mfa.client';
import {
  currentUserForAccessToken,
  listThreadsStatus,
  listThreadsStatusForAccessToken,
} from '../../src/clients/api/session-tokens.client';
import { enableOrgSso } from '../../src/clients/api/sso.client';
import { stubOfficeHost } from '../../src/clients/office-host-stub';
import { createUser } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';
import {
  OUTLOOK_DIALOG_PATH,
  dialogTokens,
  submitDialogPasswordLogin,
} from '../../src/flows/outlook.flow';

// The Office dialog runs the regular login and ends by handing the session to
// the add-in pane. Outlook isn't available here; a stub replaces office.js and
// records what the dialog sends through messageParent.
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await stubOfficeHost(page);
});

test('hands a password login to the add-in as working tokens', async ({
  page,
  api,
  mail,
}) => {
  const user = await createUser(api, mail, `outlook-pw-${Date.now()}`);

  await page.goto(OUTLOOK_DIALOG_PATH);
  await submitDialogPasswordLogin(page, user.email, user.password);
  const tokens = await dialogTokens(page);

  expect((await currentUserForAccessToken(tokens.accessToken)).email).toBe(
    user.email,
  );
  expect(await listThreadsStatusForAccessToken(tokens.accessToken)).toBe(403);
  // On Outlook on the web the dialog shares cookies with the web app, which
  // must stay signed in.
  const cookieNames = (await page.context().cookies()).map(({ name }) => name);
  expect(cookieNames).toContain('refresh_token');
  expect(await listThreadsStatus(page.request)).toBe(200);
});

test('hands a password login over after a detour through forgot password', async ({
  page,
  api,
  mail,
}) => {
  const user = await createUser(api, mail, `outlook-forgot-${Date.now()}`);

  await page.goto(OUTLOOK_DIALOG_PATH);
  await page.getByTestId('email').fill(user.email);
  await page.getByTestId('login-continue').click();
  await page.getByTestId('login-forgot-password').click();
  await page.getByTestId('forgot-email').fill(user.email);
  await page.getByTestId('forgot-submit').click();
  await page.waitForURL(/\/login/);
  await submitDialogPasswordLogin(page, user.email, user.password);
  const tokens = await dialogTokens(page);

  expect((await currentUserForAccessToken(tokens.accessToken)).email).toBe(
    user.email,
  );
});

test('hands a login that passed two-factor verification', async ({
  page,
  api,
  mail,
  publicApi,
}) => {
  const user = await createUser(api, mail, `outlook-mfa-${Date.now()}`);
  await login(publicApi, user.email, user.password);
  const [recoveryCode] = await enableTotp(publicApi);

  await page.goto(OUTLOOK_DIALOG_PATH);
  await submitDialogPasswordLogin(page, user.email, user.password);
  await page.getByTestId('two-factor-toggle-recovery-code').click();
  await page.getByTestId('two-factor-recovery-code').fill(recoveryCode);
  await page.getByTestId('two-factor-submit').click();
  const tokens = await dialogTokens(page);

  expect((await currentUserForAccessToken(tokens.accessToken)).email).toBe(
    user.email,
  );
});

test('hands an SSO login over from the SSO success page', async ({
  page,
  mail,
  publicApi,
}) => {
  const key = Date.now().toString(36);
  const domain = `outlook-sso-${key}.e2e.local`;
  const email = `admin@${domain}`;
  const password = 'E2e-Password-1';
  await registerOrg(publicApi, {
    email,
    password,
    orgName: `Outlook SSO ${key}`,
    userName: `Outlook SSO Admin ${key}`,
  });
  await confirmEmail(publicApi, await mail.extractLinkToken(email, '/confirm-email'));
  await login(publicApi, email, password);
  const { orgId } = await generatedApi.authenticationControllerMe({
    api: publicApi,
  });
  const userCookies = (await publicApi.storageState()).cookies;
  await login(publicApi, 'admin@demo.local', 'admin');
  await enableOrgSso(publicApi, orgId, domain, `zitadel-${key}`);

  // The broker round trip itself is covered by the SSO account-link spec;
  // here the start request is answered locally and the callback's outcome,
  // a cookie session, is put in place before the success page loads.
  await page.route('**/api/auth/sso/organizations/*/start', (route) =>
    route.fulfill({ status: 200, body: 'broker' }),
  );
  await page.goto(OUTLOOK_DIALOG_PATH);
  await page.getByTestId('email').fill(email);
  await page.getByTestId('login-continue').click();
  await page.getByTestId('login-sso').click();
  await page.waitForURL(/\/auth\/sso\/organizations\/.+\/start/);
  await page.context().addCookies(userCookies);
  await page.goto('/sso/success');
  const tokens = await dialogTokens(page);

  expect((await currentUserForAccessToken(tokens.accessToken)).email).toBe(
    email,
  );
});

// Desktop Outlook keeps the dialog's cookie session after the pane signed
// out, so the next dialog would hand the old account over without a form.
test('shows the login form for a different account despite a kept session', async ({
  page,
  api,
  mail,
  publicApi,
}) => {
  const first = await createUser(api, mail, `outlook-first-${Date.now()}`);
  const second = await createUser(api, mail, `outlook-second-${Date.now()}`);
  await login(publicApi, first.email, first.password);
  await page.context().addCookies((await publicApi.storageState()).cookies);

  await page.goto(OUTLOOK_DIALOG_PATH);
  expect((await dialogTokens(page)).accessToken).toBeTruthy();

  await page.goto(`${OUTLOOK_DIALOG_PATH}&prompt=login`);
  await submitDialogPasswordLogin(page, second.email, second.password);
  const tokens = await dialogTokens(page);

  expect((await currentUserForAccessToken(tokens.accessToken)).email).toBe(
    second.email,
  );
});
