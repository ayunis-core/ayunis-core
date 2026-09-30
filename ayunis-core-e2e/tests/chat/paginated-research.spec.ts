import { createServer, type Server } from "node:http";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { sendMessage } from "../../src/flows/chat.flow";

let researchServer: Server;
let researchBaseUrl: string;

test.beforeAll(async () => {
  researchServer = createServer((_request, response) => {
    const content = Array.from(
      { length: 300 },
      (_, index) =>
        `<p>Municipal research line ${index + 1} ${"x".repeat(100)}</p>`,
    ).join("");
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(`<html><body>${content}</body></html>`);
  });
  researchBaseUrl = await listen(researchServer);
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    researchServer.close((error) => (error ? reject(error) : resolve()));
  });
});

test("completes multi-document and multi-website research with bounded tool results", async ({
  page,
  api,
}) => {
  const defaultModel =
    await generatedApi.modelsDefaultsControllerGetEffectiveDefaultModel({
      api,
    });
  const permittedModelId = defaultModel.permittedLanguageModel?.id;
  expect(permittedModelId).toBeDefined();
  const thread = await generatedApi.threadsControllerCreate(
    { modelId: permittedModelId },
    { api },
  );
  const documents = await Promise.all(
    Array.from({ length: 3 }, (_, index) =>
      generatedApi.artifactsControllerCreate(
        {
          title: `Research document ${index + 1}`,
          content: `<p>${"Document research ".repeat(12_000)}</p>`,
          threadId: thread.id,
          authorType: "USER",
        },
        { api },
      ),
    ),
  );
  const prompt =
    "E2E trigger paginated research: " +
    JSON.stringify({
      documentIds: documents.map((document) => document.id),
      urls: Array.from(
        { length: 3 },
        (_, index) => `${researchBaseUrl}/source-${index + 1}`,
      ),
    });

  await page.goto(`/chats/${thread.id}`);
  await sendMessage(page, prompt);

  await expect(page.getByTestId("assistant-message").last()).toContainText(
    "research-complete::",
  );
  const persisted = await generatedApi.threadsControllerFindOne(thread.id, {
    api,
  });
  const toolResults = persisted.messages
    .filter((message) => message.role === "tool")
    .flatMap((message) => message.content);
  expect(toolResults).toHaveLength(6);
  for (const content of toolResults) {
    const result = JSON.parse(content.result);
    expect(result.truncated).toBe(true);
    expect(result.actualStartLine).toBe(1);
    expect(result.nextPage.startLine).toBeGreaterThan(1);
    expect(content.result.length).toBeLessThan(7_000);
  }
});

function listen(server: Server): Promise<string> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Research server did not expose a TCP port"));
        return;
      }
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}
