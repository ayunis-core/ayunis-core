import { request as apiRequest } from '@playwright/test';
import { config } from '../../src/config';
import { test, expect } from '../../src/fixtures/test';
import { createUser } from '../../src/factories/user.factory';
import { login } from '../../src/clients/api/auth.client';
import { dismissWelcomeVideo } from '../../src/clients/api/onboarding.client';
import { skipChatPersonalization } from '../../src/clients/api/chat-settings.client';
import { createEmptyThread } from '../../src/clients/api/threads.client';
import { getEffectiveDefaultModel } from '../../src/clients/api/models.client';
import {
  enableAcademyForOrg,
  getAcademyAccessStatus,
  requireAcademyCompletion,
  stopRequiringAcademyCompletion,
} from '../../src/clients/api/academy.client';
import {
  backfillAcademyForTestOrg,
  setLegacyAcademyAccountCreatedAt,
} from '../../src/clients/database.client';

test('backfills legacy Academy access while future users remain blocked', async ({
  api,
  browser,
  mail,
  org,
}) => {
  const legacyUser = await createUser(api, mail, `legacy-${Date.now()}`);
  const futureUser = await createUser(api, mail, `future-${Date.now()}`);
  await setLegacyAcademyAccountCreatedAt(org.orgId, legacyUser.id);
  const modelId = (await getEffectiveDefaultModel(api))?.id ?? '';
  expect(modelId).not.toBe('');
  await enableAcademyForOrg(org.orgId);
  await requireAcademyCompletion(api);
  const legacyApi = await apiRequest.newContext({ baseURL: config.apiURL });
  const futureApi = await apiRequest.newContext({ baseURL: config.apiURL });

  try {
    await login(legacyApi, legacyUser.email, legacyUser.password);
    await login(futureApi, futureUser.email, futureUser.password);
    await dismissWelcomeVideo(legacyApi);
    await skipChatPersonalization(legacyApi);
    await dismissWelcomeVideo(futureApi);
    await skipChatPersonalization(futureApi);

    for (const principal of [legacyApi, futureApi]) {
      expect((await getAcademyAccessStatus(principal)).allowed).toBe(false);
      await expect(
        createEmptyThread(principal, modelId),
      ).rejects.toThrow(/HTTP 403/);
    }

    expect(await backfillAcademyForTestOrg(org.orgId)).toBe(1);

    const legacyStatus = await getAcademyAccessStatus(legacyApi);
    expect(legacyStatus).toMatchObject({
      allowed: true,
      mode: 'required_once',
      expiresAt: null,
    });
    expect(
      new Date(legacyStatus.completedAt ?? '').toLocaleDateString('en-CA', {
        timeZone: 'Europe/Berlin',
      }),
    ).toBe('2026-10-07');
    expect(
      await createEmptyThread(legacyApi, modelId),
    ).toHaveProperty('id');
    expect((await getAcademyAccessStatus(futureApi)).allowed).toBe(false);
    await expect(
      createEmptyThread(futureApi, modelId),
    ).rejects.toThrow(/HTTP 403/);

    for (const [principal, allowed] of [
      [legacyApi, true],
      [futureApi, false],
    ] as const) {
      const context = await browser.newContext({
        storageState: await principal.storageState(),
      });
      try {
        const page = await context.newPage();
        await page.goto(`${config.baseURL}/chat`);
        await page.getByTestId('input').fill('Academy backfill access check');
        await expect(page.getByTestId('send')).toBeEnabled({ enabled: allowed });
      } finally {
        await context.close();
      }
    }

    expect(await backfillAcademyForTestOrg(org.orgId)).toBe(0);
  } finally {
    await stopRequiringAcademyCompletion(api);
    await legacyApi.dispose();
    await futureApi.dispose();
  }
});
