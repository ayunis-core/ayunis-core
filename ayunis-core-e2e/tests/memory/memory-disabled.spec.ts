import { requestFeatureToggles } from '../../src/clients/api/routines.client';
import {
  NO_MEMORY,
  clearMemory,
  createChat,
  defaultModel,
  reportMemory,
  requestMemory,
} from '../../src/clients/api/memory.client';
import {
  getOrgLanguageGrant,
  setChatHistoryAccess,
  setMemoryAccess,
} from '../../src/clients/api/models.client';
import { getOnboardingStage } from '../../src/clients/api/onboarding.client';
import {
  NO_PAST_CHATS,
  reportPastChats,
} from '../../src/clients/api/past-chats.client';
import { expect, test } from '../../src/fixtures/test';
import {
  openModelSettings,
  openSettings,
} from '../../src/flows/memory.flow';

// Same database and frontend build, served by a second backend started with
// FEATURE_MEMORY_ENABLED=false (see .github/workflows/e2e-tests.yml).
const disabledBaseUrl =
  process.env.E2E_MEMORY_DISABLED_BASE_URL ?? 'http://localhost:3003';
// Locally the dev frontend and backend listen on different ports.
const disabledApiUrl =
  process.env.E2E_MEMORY_DISABLED_API_URL ?? disabledBaseUrl;

test('with memory disabled there is no memory API and chats get no memory or past chats, even on a model with access to both', async ({
  api,
}) => {
  test.setTimeout(60_000);
  const model = await defaultModel(api);
  await setMemoryAccess(api, model.id, true);
  await setChatHistoryAccess(api, model.id, true);
  try {
    const toggles = await requestFeatureToggles(api, disabledApiUrl);
    expect(await toggles.json()).toMatchObject({ memoryEnabled: false });
    expect((await requestMemory(api, disabledApiUrl)).status()).toBe(404);

    const threadId = await createChat(api, model.id);
    const reports = [];
    for (let message = 1; message <= 5; message++) {
      reports.push(await reportMemory(api, threadId, disabledApiUrl));
    }

    expect(reports).toEqual(Array(5).fill(NO_MEMORY));
    expect(await reportPastChats(api, threadId, disabledApiUrl)).toEqual(
      NO_PAST_CHATS,
    );
  } finally {
    await setMemoryAccess(api, model.id, false);
    await setChatHistoryAccess(api, model.id, false);
  }
});

test('with memory disabled the model settings offer no memory or past-chat switch and anonymous mode still saves', async ({
  api,
  page,
}) => {
  const model = await defaultModel(api);
  await setMemoryAccess(api, model.id, true);
  await setChatHistoryAccess(api, model.id, true);
  try {
    await openModelSettings(page, disabledBaseUrl);
    const anonymousToggle = page.getByTestId(
      `model-${model.modelId}-anonymous-only-toggle`,
    );
    await expect(anonymousToggle).toHaveAttribute('data-state', 'unchecked');
    await expect(
      page.getByTestId(`model-${model.modelId}-memory-access-toggle`),
    ).toHaveCount(0);
    await expect(
      page.getByTestId(`model-${model.modelId}-chat-history-access-toggle`),
    ).toHaveCount(0);

    await anonymousToggle.click();
    await expect
      .poll(() => getOrgLanguageGrant(api, model.id))
      .toMatchObject({
        anonymousOnly: true,
        memoryAccess: true,
        chatHistoryAccess: true,
      });
    await anonymousToggle.click();
    await expect
      .poll(() => getOrgLanguageGrant(api, model.id))
      .toMatchObject({
        anonymousOnly: false,
        memoryAccess: true,
        chatHistoryAccess: true,
      });

    await openSettings(page, disabledBaseUrl);
    await expect(page.getByTestId('settings-nav-memory')).toHaveCount(0);
  } finally {
    await setMemoryAccess(api, model.id, false);
    await setChatHistoryAccess(api, model.id, false);
  }
});

test('with memory disabled the new chat page is the plain composer without an onboarding hint, even for a user the hint applies to', async ({
  api,
  page,
}) => {
  const model = await defaultModel(api);
  await setMemoryAccess(api, model.id, true);
  try {
    await clearMemory(api);
    expect(await getOnboardingStage(api)).toMatchObject({ stage: 'profile' });
    expect(await getOnboardingStage(api, disabledApiUrl)).toEqual({
      stage: null,
      modelId: null,
    });

    const stageLoaded = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/onboarding/stage',
    );
    await page.goto(`${disabledBaseUrl}/chat`);
    await stageLoaded;
    await expect(page.getByTestId('input')).toBeVisible();
    await expect(page.getByTestId('new-chat-onboarding-hint')).toHaveCount(0);
  } finally {
    await setMemoryAccess(api, model.id, false);
  }
});
