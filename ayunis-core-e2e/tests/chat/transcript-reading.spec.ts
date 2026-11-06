import type { APIRequestContext } from '@playwright/test';
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { sendMessage, startThread } from "../../src/flows/chat.flow";

const TRANSCRIPT =
  'Council budget approved. "The vote is final." \\ '.repeat(1500) +
  "END-OF-MEETING";

test("reads an existing single-line transcript completely through bounded tool pages", async ({
  page,
  api,
}) => {
  await permitEmbeddingModel(api);
  const threadId = await startThread(page, "Read my meeting transcript");
  const upload = await api.post(`/api/threads/${threadId}/sources/file`, {
    multipart: {
      file: {
        name: "old-meeting-transcript.txt",
        mimeType: "text/plain",
        buffer: Buffer.from(TRANSCRIPT),
      },
    },
  });
  expect(upload.ok()).toBe(true);
  await expect
    .poll(async () => {
      const sources =
        await generatedApi.threadSourcesControllerGetThreadSources(threadId, {
          api,
        });
      return sources.map((source) => source.status);
    })
    .toEqual(["ready"]);
  const sources = await generatedApi.threadSourcesControllerGetThreadSources(
    threadId,
    { api },
  );
  await page.goto(`/chats/${threadId}`);
  await sendMessage(page, `E2E read full transcript: ${sources[0].id}`);
  await expect(page.getByTestId("assistant-message").last()).toContainText(
    `transcript-complete::${TRANSCRIPT.length}::`,
  );
  await expect(page.getByTestId("assistant-message").last()).toContainText(
    "END-OF-MEETING",
  );
  const thread = await generatedApi.threadsControllerFindOne(threadId, { api });
  const results = thread.messages
    .filter((message) => message.role === "tool")
    .flatMap((message) => message.content);
  expect(results.length).toBeGreaterThan(1);
  const pages = results.map((content) => {
    expect(content.result.length).toBeLessThan(30000);
    const result = JSON.parse(content.result);
    expect(result.actualStartLine).toBe(1);
    expect(result.actualEndLine).toBe(1);
    return result;
  });
  expect(pages.map((result) => result.text).join("")).toBe(TRANSCRIPT);
  expect(pages.at(-1).nextPage).toBeNull();
});

async function permitEmbeddingModel(api: APIRequestContext): Promise<void> {
  const models = await generatedApi.modelsControllerGetAvailableEmbeddingModels(
    { api },
  );
  const model = models[0];
  if (!model) throw new Error("No embedding model available");
  if (!model.permittedModelId)
    await generatedApi.modelsControllerCreatePermittedModel(
      { modelId: model.modelId },
      { api },
    );
}
