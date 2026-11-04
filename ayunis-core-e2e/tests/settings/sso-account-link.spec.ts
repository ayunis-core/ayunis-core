import { dismissWelcomeVideo, dismissWelcomeVideoFromBrowserContext } from '../../src/clients/api/onboarding.client';
import { skipChatPersonalization } from '../../src/clients/api/chat-settings.client';
import { permitFirstLanguageModelAsDefault } from '../../src/clients/api/models.client';
import { config } from '../../src/config';
import { randomUUID } from 'node:crypto';
import { test, expect } from '../../src/fixtures/test';
import { login, registerOrg, confirmEmail } from '../../src/clients/api/auth.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { startOidcBroker } from '../../src/clients/oidc-broker.client';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('SSO account linking', () => {
  test.describe.configure({ mode: 'serial' });
  let broker: Awaited<ReturnType<typeof startOidcBroker>>;

  test.beforeAll(async () => { broker = await startOidcBroker(); });

  test.afterAll(async () => { await broker?.close(); });

  test('links an existing account, preserves ownership, and recognises a JIT user', async ({ page, publicApi, mail }) => {
    test.setTimeout(90_000);
    const key = randomUUID();
    const domain = `link-${key}.example`;
    const email = `owner@${domain}`;
    const password = 'E2e-Password-1';
    const brokerOrg = `broker-${key}`;
    expect((await publicApi.get('/api/auth/sso/link/status')).status()).toBe(401);
    await registerOrg(publicApi, { email, password, orgName: `Link ${key}`, userName: 'Link Owner' });
    await confirmEmail(publicApi, await mail.extractLinkToken(email, '/confirm-email'));
    await login(publicApi, email, password);
    await permitFirstLanguageModelAsDefault(publicApi);
    await dismissWelcomeVideo(publicApi);
    await skipChatPersonalization(publicApi);
    const owner = await generatedApi.authenticationControllerMe({ api: publicApi });
    const ownerCookies = (await publicApi.storageState()).cookies;
    await page.context().clearCookies();
    await page.context().addCookies(ownerCookies);
    await page.goto('/settings/account');
    await expect(page.getByTestId('account-settings-page')).toBeVisible();
    await expect(page.getByTestId('account-sso-connect')).toHaveCount(0);
    expect((await page.request.post(`${config.apiURL}/api/auth/sso/link/start`)).status()).toBe(404);

    await login(publicApi, 'admin@demo.local', 'admin');
    await generatedApi.superAdminSsoConnectionsControllerConfigure(owner.orgId, {
      emailDomains: [domain], zitadelOrgId: brokerOrg, domainVerified: true,
    }, { api: publicApi });
    await generatedApi.superAdminSsoConnectionsControllerSetEnabled(owner.orgId, {
      enabled: true, confirmed: true, reviewedEmailDomains: [domain], reviewedZitadelOrgId: brokerOrg,
    }, { api: publicApi });
    await generatedApi.superAdminSsoConnectionsControllerSetJitProvisioning(owner.orgId,
      { enabled: true }, { api: publicApi });
    await page.reload();
    await expect(page.getByTestId('account-sso-connect')).toBeVisible();

    await page.goto('/settings/account?ssoLinked=true');
    await expect(page.getByTestId('account-sso-connect')).toBeVisible();
    await expect(page.getByTestId('account-sso-connected')).toHaveCount(0);
    broker.setIdentity({ email, orgId: brokerOrg, subject: `owner-${key}` });
    await page.context().clearCookies();
    await page.goto(`/sso/${domain}`);
    await expect(page).toHaveURL(/SSO_ACCOUNT_LINK_REQUIRED/);
    await page.getByTestId('sso-error-login').click();
    await expect(page).toHaveURL(/redirect=%2Fsettings%2Faccount/);
    await page.getByTestId('email').fill(email);
    await page.getByTestId('login-continue').click();
    await page.getByTestId('password').fill(password);
    await page.getByTestId('submit').click();
    await expect(page).toHaveURL(/\/settings\/account$/);
    await expect(page.getByTestId('account-sso-connect')).toBeVisible();

    broker.setIdentity({ email: `someone-else@${domain}`, orgId: brokerOrg, subject: `wrong-${key}` });
    await page.getByTestId('account-sso-connect').click();
    await expect(page).toHaveURL(/SSO_ACCOUNT_LINK_MISMATCH/);
    await page.goto('/settings/account');
    await expect(page.getByTestId('account-sso-connect')).toBeVisible();
    expect((await page.request.get(`${config.apiURL}/api/auth/me`)).ok()).toBe(true);

    broker.setIdentity({ email, orgId: brokerOrg, subject: `owner-${key}` });
    await page.getByTestId('account-sso-connect').click();
    await expect(page).toHaveURL(/\/settings\/account\?ssoLinked=true/);
    await expect(page.getByTestId('account-sso-connected')).toBeVisible();
    await expect(page.getByTestId('account-sso-connect')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('account-sso-connected')).toBeVisible();
    expect((await page.request.post(`${config.apiURL}/api/auth/sso/link/start`)).status()).toBe(404);

    await generatedApi.superAdminSsoConnectionsControllerSetEnabled(owner.orgId,
      { enabled: false }, { api: publicApi });
    await page.reload();
    await expect(page.getByTestId('account-sso-card')).toHaveCount(0);
    expect((await page.request.post(`${config.apiURL}/api/auth/sso/link/start`)).status()).toBe(404);
    await generatedApi.superAdminSsoConnectionsControllerSetEnabled(owner.orgId, {
      enabled: true, confirmed: true, reviewedEmailDomains: [domain], reviewedZitadelOrgId: brokerOrg,
    }, { api: publicApi });
    await page.reload();
    await expect(page.getByTestId('account-sso-connected')).toBeVisible();

    await page.context().clearCookies();
    await page.goto(`/sso/${domain}`);
    await expect(page).not.toHaveURL(/\/sso\/error/);
    await expect.poll(async () => (await page.request.get(`${config.apiURL}/api/auth/me`)).status()).toBe(200);
    const afterLogin = await (await page.request.get(`${config.apiURL}/api/auth/me`)).json() as { id: string };
    expect(afterLogin.id).toBe(owner.id);
    await expect(page.getByTestId('chat-input')).toBeVisible();

    const jitEmail = `new@${domain}`;
    broker.setIdentity({ email: jitEmail, orgId: brokerOrg, subject: `jit-${key}` });
    await page.context().clearCookies();
    await page.goto(`/sso/${domain}`);
    await expect.poll(async () => (await page.request.get(`${config.apiURL}/api/auth/me`)).status()).toBe(200);
    await dismissWelcomeVideoFromBrowserContext(page.request);
    await page.goto('/settings/account');
    await expect(page.getByTestId('account-sso-connected')).toBeVisible();
    await expect(page.getByTestId('account-sso-connect')).toHaveCount(0);
    const jit = await (await page.request.get(`${config.apiURL}/api/auth/me`)).json() as { id: string; email: string };
    expect(jit.email).toBe(jitEmail);
    expect(jit.id).not.toBe(owner.id);
  });
});
