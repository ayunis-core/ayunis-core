import {
  confirmEmail,
  discoverSso,
  getCurrentUser,
  login,
  markWelcomeVideoSeen,
  refreshSession,
  registerOrg,
  submitLoginAttempt,
} from '../../src/clients/api/auth.client';
import { inviteUser } from '../../src/clients/api/invites.client';
import { createApiContext } from '../../src/factories/api-context.factory';
import { test, expect } from '../../src/fixtures/test';

test.use({ storageState: { cookies: [], origins: [] } });

const ACCOUNT_LOCKOUT_THRESHOLD = 10;

test('configures SSO and enforces organization-only login independently', async ({
  mail,
  page,
  publicApi,
}) => {
  const key = Date.now();
  const firstDomain = `sso-${key}.example`;
  const secondDomain = `sso-alt-${key}.example`;
  const customerEmail = `admin@${firstDomain}`;
  const customerPassword = `SSO-E2E-${key}-Aa1`;
  await registerOrg(publicApi, {
    email: customerEmail,
    password: customerPassword,
    orgName: `SSO E2E ${key}`,
    userName: 'SSO E2E Admin',
  });
  const confirmationToken = await mail.extractLinkToken(
    customerEmail,
    '/confirm-email',
  );
  await confirmEmail(publicApi, confirmationToken);
  await login(publicApi, customerEmail, customerPassword);
  await refreshSession(publicApi);
  const orgId = (await getCurrentUser(publicApi)).orgId;
  const customerStorage = await publicApi.storageState();
  const inviteeEmail = `invitee@${firstDomain}`;
  await inviteUser(publicApi, inviteeEmail);
  const inviteToken = await mail.extractLinkToken(
    inviteeEmail,
    '/accept-invite',
  );

  await login(publicApi, 'admin@demo.local', 'admin');
  await markWelcomeVideoSeen(publicApi);
  await page.context().addCookies((await publicApi.storageState()).cookies);
  const mappingPath = `/api/super-admin/orgs/${orgId}/sso`;
  const idpPath = `${mappingPath}/idp`;

  await page.goto(`/super-admin-settings/orgs/${orgId}?tab=sso`);
  await page.getByTestId('sso-email-domain-0').fill(firstDomain);
  await page.getByTestId('sso-add-email-domain').click();
  await page.getByTestId('sso-email-domain-1').fill(secondDomain);
  await page.getByTestId('sso-zitadel-org-id').fill(`zitadel-org-${key}`);
  const initialIdp = `zitadel-idp-${key}`;
  await page.getByTestId('sso-zitadel-idp-id').fill(initialIdp);
  await page.getByTestId('sso-domain-verified').click();

  const configured = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === mappingPath,
  );
  await page.getByTestId('sso-connection-save').click();
  const configuredResponse = await configured;
  expect(configuredResponse.ok()).toBe(true);
  await expect(configuredResponse.json()).resolves.toMatchObject({
    connection: {
      emailDomains: [
        { emailDomain: firstDomain },
        { emailDomain: secondDomain },
      ],
      zitadelIdpId: initialIdp,
    },
  });

  await page.getByTestId('sso-enable').click();
  await page.getByTestId('sso-enable-reviewed').click();
  const enabledConnectionLoaded = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === mappingPath,
  );
  await page.getByTestId('sso-enable-confirm').click();
  expect((await enabledConnectionLoaded).ok()).toBe(true);
  await expect(page.getByTestId('sso-email-domain-0')).toBeDisabled();
  await expect(page.getByTestId('sso-email-domain-1')).toBeDisabled();
  await expect(page.getByTestId('sso-zitadel-idp-id')).toBeEnabled();
  await expect(page.getByTestId('sso-zitadel-idp-id')).toHaveValue(initialIdp);
  await expect(page.getByTestId('sso-connection-save')).toBeEnabled();

  let mappingWrites = 0;
  page.on('request', (request) => {
    if (request.method() === 'PUT' && new URL(request.url()).pathname === mappingPath) {
      mappingWrites += 1;
    }
  });
  const updatedIdp = `zitadel-idp-updated-${key}`;
  const idpUpdated = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === idpPath,
  );
  await page.getByTestId('sso-zitadel-idp-id').fill(updatedIdp);
  await page.getByTestId('sso-connection-save').click();
  expect((await idpUpdated).ok()).toBe(true);
  expect(mappingWrites).toBe(0);

  await expect(discoverSso(publicApi, `first@${firstDomain}`)).resolves.toEqual({
    available: true,
    orgId,
    localPasswordLoginEnabled: true,
  });
  await expect(
    discoverSso(publicApi, `second@${secondDomain}`),
  ).resolves.toEqual({
    available: true,
    orgId,
    localPasswordLoginEnabled: true,
  });

  await page.reload();
  await expect(page.getByTestId('sso-zitadel-idp-id')).toHaveValue(updatedIdp);

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByTestId('email').fill(`first@${firstDomain}`);
  await page.getByTestId('login-continue').click();
  await expect(page.getByTestId('login-sso')).toBeVisible();
  await expect(page.getByTestId('password')).toBeVisible();

  await page.context().addCookies((await publicApi.storageState()).cookies);
  await page.goto(`/super-admin-settings/orgs/${orgId}?tab=sso`);
  await page.getByTestId('sso-required').click();
  await page.getByTestId('sso-required-reviewed').click();
  await page.getByTestId('sso-required-confirm').click();
  await expect(page.getByTestId('sso-required')).toBeChecked();
  await expect(page.getByTestId('sso-zitadel-idp-id')).toBeDisabled();

  await expect(discoverSso(publicApi, `first@${firstDomain}`)).resolves.toEqual({
    available: true,
    orgId,
    localPasswordLoginEnabled: false,
  });

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByTestId('email').fill(`first@${firstDomain}`);
  await page.getByTestId('login-continue').click();
  await expect(page.getByTestId('login-sso')).toBeVisible();
  await expect(page.getByTestId('password')).toHaveCount(0);
  await expect(page.getByTestId('submit')).toHaveCount(0);

  await page.goto(`/accept-invite?token=${inviteToken}`);
  await expect(page.getByTestId('invite-accept-sso')).toBeVisible();
  await expect(page.getByTestId('invite-accept-password')).toHaveCount(0);
  await expect(page.getByTestId('invite-accept-submit')).toHaveCount(0);
  const inviteSsoPath = `/api/auth/sso/organizations/${orgId}/start`;
  await page.route(`**${inviteSsoPath}`, (route) =>
    route.fulfill({ status: 204 }),
  );
  const inviteSsoStart = page.waitForRequest(
    (request) => new URL(request.url()).pathname === inviteSsoPath,
  );
  await page.getByTestId('invite-accept-sso').click();
  expect(new URL((await inviteSsoStart).url()).pathname).toBe(inviteSsoPath);
  await page.unroute(`**${inviteSsoPath}`);

  const customerApi = await createApiContext(customerStorage);
  try {
    await expect(refreshSession(customerApi)).rejects.toThrow(
      /HTTP 401.*Invalid refresh token/,
    );
    for (let attempt = 0; attempt < ACCOUNT_LOCKOUT_THRESHOLD; attempt += 1) {
      const response = await submitLoginAttempt(
        customerApi,
        customerEmail,
        'wrong-password',
      );
      expect(response.status()).toBe(401);
      await expect(response.json()).resolves.not.toMatchObject({
        code: 'USER_ACCOUNT_LOCKED',
      });
    }
    const retainedPasswordLogin = await submitLoginAttempt(
      customerApi,
      customerEmail,
      customerPassword,
    );
    expect(retainedPasswordLogin.status()).toBe(401);
    await expect(retainedPasswordLogin.json()).resolves.toMatchObject({
      message: 'Unauthorized',
      statusCode: 401,
    });

    await page.context().addCookies((await publicApi.storageState()).cookies);
    await page.goto(`/super-admin-settings/orgs/${orgId}?tab=sso`);
    await page.getByTestId('sso-required').click();
    await expect(page.getByTestId('sso-required')).not.toBeChecked();
    await expect(page.getByTestId('sso-zitadel-idp-id')).toBeEnabled();
    await expect(page.getByTestId('sso-jit')).not.toBeChecked();

    await expect(
      discoverSso(publicApi, `first@${firstDomain}`),
    ).resolves.toEqual({
      available: true,
      orgId,
      localPasswordLoginEnabled: true,
    });
    await page.goto(`/accept-invite?token=${inviteToken}`);
    await expect(page.getByTestId('invite-accept-password')).toBeVisible();
    await expect(page.getByTestId('invite-accept-submit')).toBeVisible();
    await expect(page.getByTestId('invite-accept-sso')).toHaveCount(0);
    await login(customerApi, customerEmail, customerPassword);
    await expect(getCurrentUser(customerApi)).resolves.toMatchObject({ orgId });
  } finally {
    await customerApi.dispose();
  }
});
