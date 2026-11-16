import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { sendMessage, startThread } from "../../src/flows/chat.flow";

const INVOICE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice>
  <InvoiceNumber>XR-1595</InvoiceNumber>
  <PayableAmount currencyID="EUR">119.00</PayableAmount>
</Invoice>`;

test("uploads XML in chat and answers from its plain-text content", async ({
  api,
  page,
}) => {
  await permitEmbeddingModel(api);
  const threadId = await startThread(
    page,
    "Prepare to inspect an XML invoice.",
  );
  const input = page.getByTestId("chat-file-upload-input");
  await expect(input).toHaveAttribute("accept", /\.xml/);
  await input.setInputFiles({
    name: "xrechnung.xml",
    mimeType: "application/xml",
    buffer: Buffer.from(INVOICE_XML),
  });
  await expect(page.getByTestId("chat-source")).toHaveAttribute(
    "data-source-status",
    "ready",
    { timeout: 30_000 },
  );
  const sources = await generatedApi.threadSourcesControllerGetThreadSources(
    threadId,
    {
      api,
    },
  );
  const sourceId = sources.find(({ name }) => name === "xrechnung.xml")?.id;
  expect(sourceId).toBeTruthy();

  await sendMessage(page, `E2E read full transcript: ${sourceId}`);

  const answer = page.getByTestId("assistant-message").last();
  await expect(answer).toContainText("119.00");
  await expect(answer).toContainText(
    new RegExp(
      `transcript-complete::${INVOICE_XML.length}::|Invoice [Nn]umber:\\s*XR-1595`,
    ),
  );
  const thread = await generatedApi.threadsControllerFindOne(threadId, { api });
  const retrievedText = thread.messages
    .filter((message) => message.role === "tool")
    .flatMap((message) => message.content)
    .map(({ result }) => JSON.parse(result) as { text: string })
    .map(({ text }) => text)
    .join("");
  expect(retrievedText).toBe(INVOICE_XML);
});

test("adds XML to a knowledge collection as a ready document", async ({
  api,
  page,
}) => {
  await permitEmbeddingModel(api);
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    { ownerType: "personal", name: `XML invoices ${Date.now()}` },
    { api },
  );
  try {
    await page.goto(`/knowledge-bases/${knowledgeBase.id}`);
    const input = page.getByTestId("knowledge-base-document-upload-input");
    await expect(input).toHaveAttribute("accept", /\.xml/);
    await input.setInputFiles({
      name: "xrechnung.xml",
      mimeType: "text/xml",
      buffer: Buffer.from(INVOICE_XML),
    });

    await expect
      .poll(
        async () => {
          const documents =
            await generatedApi.knowledgeBasesControllerListDocuments(
              knowledgeBase.id,
              { api },
            );
          return documents.data.map(({ name, status }) => `${name}:${status}`);
        },
        { timeout: 30_000 },
      )
      .toContain("xrechnung.xml:ready");
    await expect(
      page.getByTestId("knowledge-base-documents-card"),
    ).toContainText("xrechnung.xml");
  } finally {
    await generatedApi.knowledgeBasesControllerDelete(knowledgeBase.id, {
      api,
    });
  }
});

async function permitEmbeddingModel(api: APIRequestContext): Promise<void> {
  const models = await generatedApi.modelsControllerGetAvailableEmbeddingModels(
    { api },
  );
  const model = models[0];
  if (!model) throw new Error("No embedding model available");
  if (model.permittedModelId) return;
  await generatedApi.modelsControllerCreatePermittedModel(
    { modelId: model.modelId },
    { api },
  );
}
