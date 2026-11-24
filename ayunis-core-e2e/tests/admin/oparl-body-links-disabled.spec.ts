import {
  findOparlCatalogBody,
  linkOparlBodies,
  requestOparlBodiesLink,
  requestOparlBodyUnlink,
  requestOparlCatalogBodies,
} from '../../src/clients/api/oparl.client';
import { requestFeatureToggles } from '../../src/clients/api/routines.client';
import { expect, test } from '../../src/fixtures/test';

// Same database and frontend build, served by a second backend started with
// FEATURE_OPARL_ENABLED=false (see .github/workflows/e2e-tests.yml).
const disabledBaseUrl =
  process.env.E2E_OPARL_DISABLED_BASE_URL ?? 'http://localhost:3003';
// Locally the dev frontend and backend listen on different ports.
const disabledApiUrl =
  process.env.E2E_OPARL_DISABLED_API_URL ?? disabledBaseUrl;

// Seeded with the OParl catalog of the minimal fixture (OparlCatalogSeeder).
const SEEDED_BODY = 'Ortsgemeinde Beispielhausen';

test('with OParl disabled an org admin finds neither the council information routes nor the page, and the links stay', async ({
  api,
  page,
}) => {
  const body = await findOparlCatalogBody(api, SEEDED_BODY);
  await linkOparlBodies(api, [body.id]);

  const toggles = await requestFeatureToggles(api, disabledApiUrl);
  expect(await toggles.json()).toMatchObject({ oparlEnabled: false });
  for (const response of [
    await requestOparlCatalogBodies(api, disabledApiUrl),
    await requestOparlBodiesLink(api, [body.id], disabledApiUrl),
    await requestOparlBodyUnlink(api, body.id, disabledApiUrl),
  ])
    expect(response.status()).toBe(404);

  // The session cookie is per host, so it also signs in to the second backend.
  await page.goto(`${disabledBaseUrl}/admin-settings/oparl`);
  await expect(page).toHaveURL(/\/admin-settings\/users/);
  await expect(page.getByTestId('admin-settings-nav-oparl')).toHaveCount(0);

  expect((await findOparlCatalogBody(api, SEEDED_BODY)).linked).toBe(true);
});
