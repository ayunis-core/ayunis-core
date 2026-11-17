import { requestFeatureToggles } from '../../src/clients/api/routines.client';
import {
  createChat,
  reportMemory,
  requestMemory,
} from '../../src/clients/api/memory.client';
import { expect, test } from '../../src/fixtures/test';

// Same database, served by a second backend started with
// FEATURE_MEMORY_ENABLED=false (see .github/workflows/e2e-tests.yml).
const disabledApiUrl =
  process.env.E2E_MEMORY_DISABLED_API_URL ?? 'http://localhost:3003';

test('with memory disabled there is no memory API and chats get no memory', async ({
  api,
}) => {
  test.setTimeout(60_000);
  const toggles = await requestFeatureToggles(api, disabledApiUrl);
  expect(await toggles.json()).toMatchObject({ memoryEnabled: false });
  expect((await requestMemory(api, disabledApiUrl)).status()).toBe(404);

  const threadId = await createChat(api);
  const reports = [];
  for (let message = 1; message <= 5; message++) {
    reports.push(await reportMemory(api, threadId, disabledApiUrl));
  }

  expect(reports).toEqual(
    Array(5).fill({
      tools: 'none',
      section: 'no',
      nudge: 'no',
      personal: 'none',
    }),
  );
});
