import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { createPdf } from "../../src/factories/pdf.factory";
import { sendMessage } from "../../src/flows/chat.flow";

let server: Server;
let documentUrl: string;
const marker = `AYC-1348-${randomUUID()}`;

test.beforeAll(async () => {
  const document = createPdf("Municipal building regulations", marker);
  server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/pdf" });
    response.end(document);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing PDF server port");
  documentUrl = `http://127.0.0.1:${address.port}/regulations.pdf`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("reuses PDF OCR across website reads in a chat run and refreshes on the next run", async ({
  page,
  api,
  request,
}) => {
  const defaults =
    await generatedApi.modelsDefaultsControllerGetEffectiveDefaultModel({
      api,
    });
  const modelId = defaults.permittedLanguageModel?.id;
  expect(modelId).toBeDefined();
  const thread = await generatedApi.threadsControllerCreate(
    { modelId },
    { api },
  );
  const prompt =
    "E2E trigger paginated research: " +
    JSON.stringify({
      documentIds: [],
      urls: [documentUrl, documentUrl, documentUrl],
    });
  const ocrPort = process.env.E2E_MISTRAL_OCR_PORT ?? "3199";
  const count = async () => {
    const response = await request.get(
      `http://127.0.0.1:${ocrPort}/extractions/${marker}`,
    );
    expect(response.ok()).toBe(true);
    return (await response.json()).count as number;
  };

  await page.goto(`/chats/${thread.id}`);
  await sendMessage(page, prompt);
  await expect(page.getByTestId("assistant-message").last()).toContainText(
    "research-complete::",
  );
  expect(await count()).toBe(1);
  const persisted = await generatedApi.threadsControllerFindOne(thread.id, {
    api,
  });
  const results = persisted.messages
    .filter((message) => message.role === "tool")
    .flatMap((message) => message.content);
  expect(results).toHaveLength(3);
  for (const result of results) {
    expect(JSON.parse(result.result).content).toContain(
      "Extraction approved by council",
    );
  }

  await page.goto("/chat");
  await sendMessage(page, prompt);
  await expect(page.getByTestId("assistant-message").last()).toContainText(
    "research-complete::",
  );
  expect(await count()).toBe(2);
});
