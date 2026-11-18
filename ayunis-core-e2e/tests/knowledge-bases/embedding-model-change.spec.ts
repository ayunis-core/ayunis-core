import type { APIRequestContext } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  deleteCatalogModel,
  removePermittedModel,
} from "../../src/clients/api/models.client";
import { CreateKnowledgeBaseDtoOwnerType } from "../../src/clients/generated/ayunisCoreAPI.schemas";
import { test, expect } from "../../src/fixtures/test";
import { sendMessage, startThread } from "../../src/flows/chat.flow";

const CONTENT = `# Dog tax statute

The dog tax is 120 euros per year for the first dog.`;

test("replacing the embedding model keeps documents and makes them searchable with the new model", async ({
  api,
  page,
  publicApi,
}) => {
  test.slow();
  const suffix = `${Date.now()}`;
  const original = await permitFirstEmbeddingModel(api);
  const threadId = await startThread(page, "Answer from the dog tax statute");
  const chatDocumentId = await uploadThreadDocument(api, threadId, suffix);
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    {
      ownerType: CreateKnowledgeBaseDtoOwnerType.personal,
      name: `Statutes ${suffix}`,
    },
    { api },
  );
  const knowledgeBaseDocumentId = await uploadKnowledgeBaseDocument(
    api,
    knowledgeBase.id,
    suffix,
  );

  // The seeded embedding model has 1024 dimensions. With another dimension,
  // documents still holding the original vectors cannot answer a search.
  await login(publicApi, "admin@demo.local", "admin");
  const replacement =
    await generatedApi.superAdminEmbeddingCatalogModelsControllerCreateEmbeddingModel(
      {
        name: `e2e-embed-${suffix}`,
        provider: "mistral",
        displayName: `E2E Embed ${suffix}`,
        dimensions: 1536,
        isArchived: false,
      },
      { api: publicApi },
    );
  try {
    await removePermittedModel(api, original.permittedModelId);
    await expect(
      documentStatuses(api, threadId, knowledgeBase.id),
    ).resolves.toEqual({ chat: ["ready"], knowledgeBase: ["ready"] });

    await generatedApi.modelsControllerCreatePermittedModel(
      { modelId: replacement.id },
      { api },
    );

    await page.goto(`/knowledge-bases/${knowledgeBase.id}`);
    await expect(
      page.getByTestId(`knowledge-base-document-${knowledgeBaseDocumentId}`),
    ).toHaveAttribute("data-document-status", "ready", { timeout: 30_000 });
    await expect
      .poll(async () => documentStatuses(api, threadId, knowledgeBase.id), {
        timeout: 30_000,
      })
      .toEqual({ chat: ["ready"], knowledgeBase: ["ready"] });

    await page.goto(`/chats/${threadId}`);
    await expect(page.getByTestId("chat-source")).toHaveAttribute(
      "data-source-id",
      chatDocumentId,
    );
    await sendMessage(page, "E2E cite first source");
    await expect(page.getByTestId("source-citation").last()).toBeVisible();
  } finally {
    await restoreEmbeddingModel(api, publicApi, original.modelId, replacement.id);
    await generatedApi.knowledgeBasesControllerDelete(knowledgeBase.id, {
      api,
    });
  }
});

async function permitFirstEmbeddingModel(
  api: APIRequestContext,
): Promise<{ modelId: string; permittedModelId: string }> {
  const [model] =
    await generatedApi.modelsControllerGetAvailableEmbeddingModels({ api });
  if (!model) throw new Error("No embedding model is available");
  if (!model.permittedModelId) {
    await generatedApi.modelsControllerCreatePermittedModel(
      { modelId: model.modelId },
      { api },
    );
  }
  const permitted = (
    await generatedApi.modelsControllerGetAvailableEmbeddingModels({ api })
  ).find(({ modelId }) => modelId === model.modelId);
  if (!permitted?.permittedModelId)
    throw new Error("Embedding model not permitted");
  return {
    modelId: model.modelId,
    permittedModelId: permitted.permittedModelId,
  };
}

// The worker org gets its original model back for the tests that follow.
async function restoreEmbeddingModel(
  api: APIRequestContext,
  superAdminApi: APIRequestContext,
  originalModelId: string,
  replacementModelId: string,
): Promise<void> {
  const replacementPermit = (
    await generatedApi.modelsControllerGetAvailableEmbeddingModels({ api })
  ).find(({ modelId }) => modelId === replacementModelId)?.permittedModelId;
  if (replacementPermit) await removePermittedModel(api, replacementPermit);
  await deleteCatalogModel(superAdminApi, replacementModelId);
  await generatedApi.modelsControllerCreatePermittedModel(
    { modelId: originalModelId },
    { api },
  );
}

async function uploadThreadDocument(
  api: APIRequestContext,
  threadId: string,
  suffix: string,
): Promise<string> {
  const response = await api.post(`/api/threads/${threadId}/sources/file`, {
    multipart: {
      file: {
        name: `dog-tax-chat-${suffix}.txt`,
        mimeType: "text/plain",
        buffer: Buffer.from(CONTENT),
      },
    },
  });
  expect(response.ok()).toBe(true);
  const [source] = (await response.json()) as { id: string }[];
  await expect
    .poll(async () => (await documentStatuses(api, threadId)).chat)
    .toEqual(["ready"]);
  return source.id;
}

async function uploadKnowledgeBaseDocument(
  api: APIRequestContext,
  knowledgeBaseId: string,
  suffix: string,
): Promise<string> {
  const response = await api.post(
    `/api/knowledge-bases/${knowledgeBaseId}/documents`,
    {
      multipart: {
        file: {
          name: `dog-tax-${suffix}.txt`,
          mimeType: "text/plain",
          buffer: Buffer.from(CONTENT),
        },
      },
    },
  );
  expect(response.ok()).toBe(true);
  const document = (await response.json()) as { id: string };
  await expect
    .poll(
      async () =>
        (
          await generatedApi.knowledgeBasesControllerListDocuments(
            knowledgeBaseId,
            { api },
          )
        ).data.map(({ status }) => status),
      { timeout: 30_000 },
    )
    .toEqual(["ready"]);
  return document.id;
}

async function documentStatuses(
  api: APIRequestContext,
  threadId: string,
  knowledgeBaseId?: string,
): Promise<{ chat: string[]; knowledgeBase?: string[] }> {
  const chat = (
    await generatedApi.threadSourcesControllerGetThreadSources(threadId, {
      api,
    })
  ).map(({ status }) => status);
  if (!knowledgeBaseId) return { chat };
  const knowledgeBase = (
    await generatedApi.knowledgeBasesControllerListDocuments(knowledgeBaseId, {
      api,
    })
  ).data.map(({ status }) => status);
  return { chat, knowledgeBase };
}
