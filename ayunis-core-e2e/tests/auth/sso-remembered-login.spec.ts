import { test, expect } from '../../src/fixtures/test';

test.use({ storageState: { cookies: [], origins: [] } });

const rememberedOrgIdKey = 'ayunis.sso.rememberedOrgId';
const rememberedOrgId = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4';

test('offers the remembered organization without asking for an email', async ({
  page,
}) => {
  await page.goto('/login?redirect=%2Fsettings%2Faccount');
  await page.evaluate(
    ({ key, orgId }) => window.sessionStorage.setItem(key, orgId),
    { key: rememberedOrgIdKey, orgId: rememberedOrgId },
  );
  await page.reload();

  await expect(page.getByTestId('login-remembered-sso')).toBeVisible();
  await expect(page.getByTestId('email')).toHaveCount(0);

  const startRequest = page.waitForRequest((request) =>
    request.url().includes(`/auth/sso/organizations/${rememberedOrgId}/start`),
  );
  await page.getByTestId('login-remembered-sso').click();

  await expect(startRequest).resolves.toBeTruthy();
});

test('clears the remembered organization when another account is chosen', async ({
  page,
}) => {
  await page.goto('/login');
  await page.evaluate(
    ({ key, orgId }) => window.sessionStorage.setItem(key, orgId),
    { key: rememberedOrgIdKey, orgId: rememberedOrgId },
  );
  await page.reload();

  await page.getByTestId('login-use-another-account').click();

  await expect(page.getByTestId('email')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => window.sessionStorage.getItem(key),
        rememberedOrgIdKey,
      ),
    )
    .toBeNull();

  await page.reload();
  await expect(page.getByTestId('email')).toBeVisible();
  await expect(page.getByTestId('login-remembered-sso')).toHaveCount(0);
});
