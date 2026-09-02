import { login, markWelcomeVideoSeen } from '../../src/clients/api/auth.client';
import {
  createSuperAdminOrg,
  getSuperAdminOrg,
} from '../../src/clients/api/super-admin-orgs.client';
import { test, expect } from '../../src/fixtures/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('renames an organization from the org detail page', async ({
  page,
  publicApi,
}) => {
  await login(publicApi, 'admin@demo.local', 'admin');
  await markWelcomeVideoSeen(publicApi);
  await page.context().addCookies((await publicApi.storageState()).cookies);
  const key = Date.now();
  const originalName = `Rename E2E ${key}`;
  const renamedName = `Renamed E2E ${key}`;
  const org = await createSuperAdminOrg(publicApi, originalName);
  const orgPath = `/api/super-admin/orgs/${org.id}`;

  await page.goto(`/super-admin-settings/orgs/${org.id}`);
  await expect(page.getByTestId('org-name-value')).toHaveText(originalName);

  await page.getByTestId('org-name-edit').click();
  await expect(page.getByTestId('org-name-input')).toHaveValue(originalName);
  await page.getByTestId('org-name-input').fill(renamedName);

  const renamed = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === orgPath,
  );
  await page.getByTestId('org-name-save').click();
  const renamedResponse = await renamed;
  expect(renamedResponse.ok()).toBe(true);
  await expect(renamedResponse.json()).resolves.toMatchObject({
    id: org.id,
    name: renamedName,
  });

  await expect(page.getByTestId('org-name-value')).toHaveText(renamedName);
  await expect(getSuperAdminOrg(publicApi, org.id)).resolves.toMatchObject({
    name: renamedName,
  });
});
