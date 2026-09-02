import {
  confirmEmail,
  login,
  registerOrg,
} from '../../src/clients/api/auth.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { expect, test } from '../../src/fixtures/test';

test('shows password and two-factor settings for local users', async ({
  page,
}) => {
  const discoveryResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith('/auth/sso/discover'),
  );

  await page.goto('/settings/account');

  await expect(page.getByTestId('account-settings-page')).toBeVisible();
  await expect(page.getByTestId('account-password-settings')).toBeVisible();
  await expect(page.getByTestId('account-two-factor-settings')).toBeVisible();
  expect((await discoveryResponse).ok()).toBe(true);
});

test('hides password and two-factor settings for SSO users', async ({
  mail,
  page,
  publicApi,
}) => {
  const key = Date.now().toString(36);
  const domain = `account-${key}.e2e.local`;
  const email = `admin@${domain}`;
  const password = 'E2e-Password-1';
  await registerOrg(publicApi, {
    email,
    password,
    orgName: `SSO Account ${key}`,
    userName: `SSO Account Admin ${key}`,
  });
  const token = await mail.extractLinkToken(email, '/confirm-email');
  await confirmEmail(publicApi, token);
  await login(publicApi, email, password);
  const currentUser = await generatedApi.authenticationControllerMe({
    api: publicApi,
  });
  const userCookies = (await publicApi.storageState()).cookies;

  await login(publicApi, 'admin@demo.local', 'admin');
  const zitadelOrgId = `zitadel-${key}`;
  await generatedApi.superAdminSsoConnectionsControllerConfigure(
    currentUser.orgId,
    {
      emailDomains: [domain],
      zitadelOrgId,
      domainVerified: true,
    },
    { api: publicApi },
  );
  await generatedApi.superAdminSsoConnectionsControllerSetEnabled(
    currentUser.orgId,
    {
      enabled: true,
      confirmed: true,
      reviewedEmailDomains: [domain],
      reviewedZitadelOrgId: zitadelOrgId,
    },
    { api: publicApi },
  );

  await page.context().clearCookies();
  await page.context().addCookies(userCookies);

  await page.goto('/settings/account');

  await expect(page.getByTestId('account-settings-page')).toBeVisible();
  await expect(page.getByTestId('account-password-settings')).toHaveCount(0);
  await expect(page.getByTestId('account-two-factor-settings')).toHaveCount(0);
});
