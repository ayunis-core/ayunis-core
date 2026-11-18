import { randomUUID } from "node:crypto";
import type { APIRequestContext, Browser } from "@playwright/test";
import {
  getAuthenticatedPrincipalId,
  login,
  markWelcomeVideoSeen,
} from "../../src/clients/api/auth.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  getEffectiveDefaultModel,
  permitEmbeddingModel,
} from "../../src/clients/api/models.client";
import {
  getRecordingFairUseLimit,
  setRecordingFairUseLimit,
} from "../../src/clients/api/platform-config.client";
import {
  createRecording,
  getRecording,
  requestRecordingUpload,
} from "../../src/clients/api/recordings.client";
import {
  createSuperAdminSubscription,
  e2eSubscriptionBilling,
} from "../../src/clients/api/super-admin-subscriptions.client";
import { createEmptyThread } from "../../src/clients/api/threads.client";
import {
  expireRecordingUploadWindow,
  findRecordingUploadCount,
} from "../../src/clients/database.client";
import { createSilentWav } from "../../src/factories/audio.factory";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import { test, expect } from "../../src/fixtures/test";

// The recording limit is platform-wide: the test that raises it must not run
// next to the ones that rely on the default of 5 per hour.
test.describe.configure({ mode: "serial" });

const DEFAULT_LIMIT = 5;
const AUDIO = {
  fileName: "sitzung.mp3",
  mimeType: "audio/mpeg",
  fileSize: 4096,
};

/** An organization of its own, so its admin's uploads start from zero. */
async function createUploader(key: string) {
  const org = await createOrg(
    `recording-fair-use-${key}`,
    test.info().outputPath(`recording-fair-use-${key}.json`),
  );
  const api = await createApiContext({ cookies: [], origins: [] });
  await login(api, org.admin.email, org.admin.password);
  await permitEmbeddingModel(api);
  return { org, api, userId: await getAuthenticatedPrincipalId(api) };
}

async function startUpload(api: APIRequestContext, name: string) {
  const recording = await createRecording(api, { ownerType: "personal", name });
  return {
    recording,
    response: await requestRecordingUpload(api, recording.id, AUDIO),
  };
}

async function startUploads(api: APIRequestContext, count: number) {
  for (let i = 1; i <= count; i++) {
    const { response } = await startUpload(api, `Ausschusssitzung ${i}`);
    expect(response.status()).toBe(201);
  }
}

async function requireDefaultModelId(api: APIRequestContext) {
  const model = await getEffectiveDefaultModel(api);
  if (!model) throw new Error("No default model is configured");
  return model.id;
}

async function loginSuperAdmin(): Promise<APIRequestContext> {
  const api = await createApiContext({ cookies: [], origins: [] });
  await login(api, "admin@demo.local", "admin");
  await markWelcomeVideoSeen(api);
  return api;
}

async function openAs(browser: Browser, api: APIRequestContext) {
  const context = await browser.newContext({
    storageState: await api.storageState(),
  });
  return { context, page: await context.newPage() };
}

test("a user can start five recording uploads per hour: the sixth is refused with its reason in the upload UI, while refused files, chat and knowledge-base audio do not count and another user still uploads", async ({
  browser,
  mail,
}) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const uploader = await createUploader(key);
  const colleague = await createMemberSession(
    uploader.api,
    mail,
    `rec-fu-${key}`,
  );
  const { context, page } = await openAs(browser, uploader.api);
  try {
    const tooLarge = await createRecording(uploader.api, {
      ownerType: "personal",
      name: "Zu groß",
    });
    expect(
      (
        await requestRecordingUpload(uploader.api, tooLarge.id, {
          ...AUDIO,
          fileSize: 25 * 1024 * 1024 + 1,
        })
      ).status(),
    ).toBe(413);
    expect(await findRecordingUploadCount(uploader.userId)).toBeNull();
    await startUploads(uploader.api, DEFAULT_LIMIT);
    expect(await findRecordingUploadCount(uploader.userId)).toBe(DEFAULT_LIMIT);

    const sixth = await createRecording(uploader.api, {
      ownerType: "personal",
      name: `Sechste Sitzung ${key}`,
    });
    await page.goto(`/recordings/${sixth.id}`);
    const refusal = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname ===
          `/api/recordings/${sixth.id}/uploads`,
    );
    await page.getByTestId("recording-audio-input").setInputFiles({
      name: `sechste-${key}.wav`,
      mimeType: "audio/wav",
      buffer: createSilentWav(2),
    });
    const refused = await refusal;
    expect(refused.status()).toBe(429);
    const body = (await refused.json()) as {
      code: string;
      metadata: { retryAfterSeconds: number };
    };
    expect(body.code).toBe("QUOTA_EXCEEDED");
    await expect(
      page.locator('[data-sonner-toast][data-type="error"]'),
    ).toContainText(String(Math.ceil(body.metadata.retryAfterSeconds / 60)));
    expect(await getRecording(uploader.api, sixth.id)).toMatchObject({
      status: "uploading",
    });

    const thread = await createEmptyThread(
      uploader.api,
      await requireDefaultModelId(uploader.api),
    );
    const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
      { ownerType: "personal", name: `Protokolle ${key}` },
      { api: uploader.api },
    );
    for (const path of [
      `/api/threads/${thread.id}/uploads`,
      `/api/knowledge-bases/${knowledgeBase.id}/uploads`,
    ]) {
      expect((await uploader.api.post(path, { data: AUDIO })).status()).toBe(
        201,
      );
    }
    expect(await findRecordingUploadCount(uploader.userId)).toBe(DEFAULT_LIMIT);

    const fromColleague = await startUpload(colleague.api, "Andere Sitzung");
    expect(fromColleague.response.status()).toBe(201);
  } finally {
    await context.close();
    await colleague.api.dispose();
    await uploader.api.dispose();
  }
});

test("a limit raised by a super admin applies to the next upload, and uploads start again once the window has passed", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const uploader = await createUploader(key);
  const superAdmin = await loginSuperAdmin();
  const { context, page } = await openAs(browser, superAdmin);
  try {
    await startUploads(uploader.api, DEFAULT_LIMIT);
    expect(
      (await startUpload(uploader.api, "Abgewiesen")).response.status(),
    ).toBe(429);

    await page.goto("/super-admin-settings/platform-config");
    await page
      .getByTestId("recording-fair-use-limit")
      .fill(String(DEFAULT_LIMIT + 1));
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" &&
        new URL(response.url()).pathname ===
          "/api/super-admin/platform-config/recording-fair-use-limit",
    );
    await page.getByTestId("recording-fair-use-save").click();
    expect((await saved).status()).toBe(204);

    expect(
      (await startUpload(uploader.api, "Nachgereicht")).response.status(),
    ).toBe(201);
    expect(
      (await startUpload(uploader.api, "Wieder zu viel")).response.status(),
    ).toBe(429);
  } finally {
    await setRecordingFairUseLimit(superAdmin, DEFAULT_LIMIT);
    await context.close();
  }
  try {
    expect(await getRecordingFairUseLimit(superAdmin)).toMatchObject({
      limit: DEFAULT_LIMIT,
    });
    await expireRecordingUploadWindow(uploader.userId);
    expect(
      (await startUpload(uploader.api, "Neue Stunde")).response.status(),
    ).toBe(201);
  } finally {
    await superAdmin.dispose();
    await uploader.api.dispose();
  }
});

test("a user in an organization with a usage-based subscription starts a sixth upload within the hour", async () => {
  const key = randomUUID().slice(0, 8);
  const uploader = await createUploader(key);
  const superAdmin = await loginSuperAdmin();
  try {
    await createSuperAdminSubscription(superAdmin, uploader.org.orgId, {
      ...e2eSubscriptionBilling,
      type: "USAGE_BASED",
      monthlyCredits: 500,
    });

    await startUploads(uploader.api, DEFAULT_LIMIT);
    const sixth = await startUpload(uploader.api, "Sechste Sitzung");
    expect(sixth.response.status()).toBe(201);
  } finally {
    await superAdmin.dispose();
    await uploader.api.dispose();
  }
});
