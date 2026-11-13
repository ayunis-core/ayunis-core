import { login } from '../../src/clients/api/auth.client';
import { requestFeatureToggles } from '../../src/clients/api/routines.client';
import { createUser } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';

// Same database and frontend build, served by a second backend started with
// FEATURE_OUTLOOK_ADDIN_ENABLED unset (see .github/workflows/e2e-tests.yml).
const disabledApiUrl =
  process.env.E2E_OUTLOOK_ADDIN_DISABLED_API_URL ?? 'http://localhost:3005';

test.use({ storageState: { cookies: [], origins: [] } });

// The add-in can neither be installed nor signed in to, while the web login
// the dialog reuses keeps working.
test('with the Outlook add-in disabled there is no manifest and no session handoff', async ({
  api,
  mail,
  publicApi,
}) => {
  const toggles = await requestFeatureToggles(api, disabledApiUrl);
  expect(await toggles.json()).toMatchObject({ outlookAddinEnabled: false });
  expect(
    (
      await publicApi.get(
        `${disabledApiUrl}/api/office-addins/outlook/manifest.xml`,
      )
    ).status(),
  ).toBe(404);

  const user = await createUser(api, mail, `outlook-off-${Date.now()}`);
  await login(publicApi, user.email, user.password);
  expect(
    (
      await publicApi.post(`${disabledApiUrl}/api/auth/session/handoff`, {
        data: { client: 'outlook' },
        headers: { Origin: disabledApiUrl },
      })
    ).status(),
  ).toBe(404);
});
