import {
  discoverSso,
  login,
  markWelcomeVideoSeen,
} from '../../src/clients/api/auth.client';
import { createSuperAdminOrg } from '../../src/clients/api/super-admin-orgs.client';
import { test, expect } from '../../src/fixtures/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('configures multiple domains and updates the direct IdP independently', async ({
  page,
  publicApi,
}) => {
  await login(publicApi, 'admin@demo.local', 'admin');
  await markWelcomeVideoSeen(publicApi);
  await page.context().addCookies((await publicApi.storageState()).cookies);
  const key = Date.now();
  const org = await createSuperAdminOrg(publicApi, `SSO E2E ${key}`);
  const mappingPath = `/api/super-admin/orgs/${org.id}/sso`;
  const idpPath = `${mappingPath}/idp`;
  const firstDomain = `sso-${key}.example`;
  const secondDomain = `sso-alt-${key}.example`;

  await page.goto(`/super-admin-settings/orgs/${org.id}?tab=sso`);
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
    orgId: org.id,
    localPasswordLoginEnabled: true,
  });
  await expect(
    discoverSso(publicApi, `second@${secondDomain}`),
  ).resolves.toEqual({
    available: true,
    orgId: org.id,
    localPasswordLoginEnabled: true,
  });

  await page.reload();
  await expect(page.getByTestId('sso-zitadel-idp-id')).toHaveValue(updatedIdp);
});
