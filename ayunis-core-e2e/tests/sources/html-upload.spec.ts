import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { sendMessage, startThread } from "../../src/flows/chat.flow";

const REPORT_HTML = `<!doctype html>
<html>
  <body>
    <header>Metzingen budget report 2027</header>
    <nav>Overview</nav>
    <main>
      <table>
        <tr><th>Department</th><th>Amount</th></tr>
        <tr><td>Library</td><td>EUR 42,000</td></tr>
      </table>
    </main>
    <footer>Approved by council</footer>
  </body>
</html>`;

test("uploads HTML in chat and answers from the full page including tables", async ({
  api,
  page,
}) => {
  await permitEmbeddingModel(api);
  const threadId = await startThread(page, "Inspect the uploaded HTML report.");
  const input = page.getByTestId("chat-file-upload-input");
  await expect(input).toHaveAttribute("accept", /(?:^|,)\.html(?:,|$)/);
  await expect(input).toHaveAttribute("accept", /(?:^|,)\.htm(?:,|$)/);
  await input.setInputFiles({
    name: "budget-report.html",
    mimeType: "text/html",
    buffer: Buffer.from(REPORT_HTML),
  });
  await expect(page.getByTestId("chat-source")).toHaveAttribute(
    "data-source-status",
    "ready",
    { timeout: 30_000 },
  );
  const sources = await generatedApi.threadSourcesControllerGetThreadSources(
    threadId,
    { api },
  );
  const sourceId = sources.find(
    ({ name }) => name === "budget-report.html",
  )?.id;
  expect(sourceId).toBeTruthy();

  await sendMessage(page, `E2E read full transcript: ${sourceId}`);

  const answer = page.getByTestId("assistant-message").last();
  await expect(answer).toContainText("EUR 42,000");
  const thread = await generatedApi.threadsControllerFindOne(threadId, { api });
  const retrievedText = thread.messages
    .filter((message) => message.role === "tool")
    .flatMap((message) => message.content)
    .map(({ result }) => JSON.parse(result) as { text: string })
    .map(({ text }) => text)
    .join("");
  expect(retrievedText).toContain("Metzingen budget report 2027");
  expect(retrievedText).toContain("Overview");
  expect(retrievedText).toContain("Department Amount");
  expect(retrievedText).toContain("Library EUR 42,000");
  expect(retrievedText).toContain("Approved by council");
});

test("shows empty HTML as a failed document", async ({ api, page }) => {
  await permitEmbeddingModel(api);
  const threadId = await startThread(page, "Inspect an empty HTML report.");
  await page.getByTestId("chat-file-upload-input").setInputFiles({
    name: "empty.htm",
    mimeType: "text/html",
    buffer: Buffer.from("<html><script>track()</script></html>"),
  });
  await expect(page.getByTestId("chat-source")).toHaveAttribute(
    "data-source-status",
    "failed",
    { timeout: 30_000 },
  );
  const thread = await generatedApi.threadsControllerFindOne(threadId, { api });
  const source = thread.sources.find(({ name }) => name === "empty.htm");
  expect(source?.processingErrorCode).toBe("DOCUMENT_EMPTY");
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
