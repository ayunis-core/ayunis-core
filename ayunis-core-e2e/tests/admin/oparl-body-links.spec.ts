import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { login } from '../../src/clients/api/auth.client';
import {
  findOparlCatalogBody,
  requestOparlBodiesLink,
  requestOparlBodyUnlink,
  requestOparlCatalogBodies,
} from '../../src/clients/api/oparl.client';
import { config } from '../../src/config';
import { createApiContext } from '../../src/factories/api-context.factory';
import { createOrg } from '../../src/factories/org.factory';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';

// Seeded with the OParl catalog of the minimal fixture (OparlCatalogSeeder).
const SEEDED_BODY = 'Gemeinde Musterstadt';

async function isLinked(
  api: APIRequestContext,
  bodyId: string,
): Promise<boolean> {
  const body = await findOparlCatalogBody(api, SEEDED_BODY);
  expect(body.id).toBe(bodyId);
  return body.linked;
}

test('an org admin links and unlinks a council body that other orgs and members cannot change', async ({
  page,
  api,
  org,
  mail,
  browser,
}) => {
  const key = randomUUID().slice(0, 8);
  const body = await findOparlCatalogBody(api, SEEDED_BODY);
  const { api: memberApi } = await createMemberSession(
    api,
    mail,
    `oparl-${key}`,
  );
  const otherOrg = await createOrg(
    `oparl-${key}`,
    test.info().outputPath('other-org.json'),
  );
  const otherOrgApi = await createApiContext({ cookies: [], origins: [] });
  await login(otherOrgApi, otherOrg.admin.email, otherOrg.admin.password);

  try {
    await page.goto('/admin-settings/oparl');
    const row = page.getByTestId(`oparl-body-${body.id}`);

    // Before the link: not linked, and a member cannot link it.
    await expect(row.getByTestId('oparl-body-select')).toBeVisible();
    await expect(row.getByTestId('oparl-body-linked')).toHaveCount(0);
    expect((await requestOparlCatalogBodies(memberApi)).status()).toBe(403);
    expect((await requestOparlBodiesLink(memberApi, [body.id])).status()).toBe(
      403,
    );
    expect(await isLinked(api, body.id)).toBe(false);

    await row.getByTestId('oparl-body-select').click();
    await page.getByTestId('oparl-bodies-link').click();
    await expect(row.getByTestId('oparl-body-linked')).toBeVisible();

    // After the link: linked for this org only, and only its admins unlink it.
    expect(await isLinked(api, body.id)).toBe(true);
    expect(await isLinked(otherOrgApi, body.id)).toBe(false);
    expect((await requestOparlBodyUnlink(otherOrgApi, body.id)).status()).toBe(
      404,
    );
    expect((await requestOparlBodyUnlink(memberApi, body.id)).status()).toBe(
      403,
    );
    expect(await isLinked(api, body.id)).toBe(true);
    expect((await requestOparlBodiesLink(api, [body.id])).status()).toBe(204);
    expect(await isLinked(api, body.id)).toBe(true);

    const superAdminApi = await createApiContext({ cookies: [], origins: [] });
    await login(superAdminApi, 'admin@demo.local', 'admin');
    const superAdminContext = await browser.newContext({
      baseURL: config.baseURL,
      storageState: await superAdminApi.storageState(),
    });
    await superAdminApi.dispose();
    try {
      const superAdminPage = await superAdminContext.newPage();
      await superAdminPage.goto('/super-admin-settings/oparl');
      await expect(
        superAdminPage
          .getByTestId(`oparl-system-body-${body.id}`)
          .getByTestId('oparl-system-body-linked-orgs'),
      ).toContainText(org.orgName);
    } finally {
      await superAdminContext.close();
    }

    await row.getByTestId('oparl-body-unlink').click();
    await expect(row.getByTestId('oparl-body-linked')).toHaveCount(0);
    await expect(row.getByTestId('oparl-body-select')).toBeVisible();
    // Unlinking removes the link, not the mirrored body.
    expect(await isLinked(api, body.id)).toBe(false);
  } finally {
    await memberApi.dispose();
    await otherOrgApi.dispose();
  }
});
