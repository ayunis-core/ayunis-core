import type { APIRequestContext, Page } from "@playwright/test";
import { createOrg } from "../../src/factories/org.factory";
import {
  grantCrawlDomain,
  revokeCrawlDomain,
} from "../../src/clients/api/crawl-domains.client";
import { createServer, type Server } from "node:http";
import { request } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { createPdf } from "../../src/factories/pdf.factory";
import { createUser } from "../../src/factories/user.factory";
import { login } from "../../src/clients/api/auth.client";
import { getThreadSourceCitationResponse } from "../../src/clients/api/threads.client";
import { sendMessage, startThread } from "../../src/flows/chat.flow";
import { config } from "../../src/config";

let server: Server;
let rootUrl: string;
let pdfUrl: string;
let pdfRequests = 0;

test.beforeAll(async () => {
  const pdf = createPdf("Municipal statute approved by council", "AYC-1031");
  server = createServer((req, res) => {
    if (req.url === "/statute.pdf") {
      pdfRequests++;
      res.writeHead(200, { "content-type": "application/pdf" });
      res.end(pdf);
    } else if (req.url === "/broken.pdf") {
      res.writeHead(404, { "content-type": "application/pdf" });
      res.end("Document not found");
    } else {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(
        `<title>Ortsrecht</title><a href="/navigation">Navigation</a><a href="${pdfUrl}#page=1">Hauptsatzung</a><a href="${pdfUrl}">Duplicate</a><a href="${pdfUrl.replace("/statute.pdf", "/broken.pdf")}">Broken statute</a>`,
      );
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing fixture port");
  rootUrl = `http://127.0.0.1:${address.port}/statutes`;
  // Other URL fixtures use 127.0.0.1, keeping this localhost grant separate.
  pdfUrl = `http://localhost:${address.port}/statute.pdf`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

test("discovers independent PDF files at depth zero and cites their original URL", async ({
  api,
  page,
  mail,
  org,
}, testInfo) => {
  test.setTimeout(120_000);
  await permitEmbeddingModel(api);
  const kb = await generatedApi.knowledgeBasesControllerCreate(
    { ownerType: "personal", name: `Discovered statutes ${Date.now()}` },
    { api },
  );
  let grantId: string | undefined;
  try {
    await generatedApi.knowledgeBasesControllerAddUrl(
      kb.id,
      { url: rootUrl, maxDepth: 0 },
      { api },
    );
    await waitForDocuments(api, kb.id, [
      "file:failed",
      "file:failed",
      "web:ready",
    ]);
    expect(pdfRequests).toBe(0);
    const denied = await generatedApi.knowledgeBasesControllerListDocuments(
      kb.id,
      { api },
    );
    for (const doc of denied.data)
      await generatedApi.knowledgeBasesControllerRemoveDocument(kb.id, doc.id, {
        api,
      });
    const grant = await grantCrawlDomain(org.orgId, new URL(pdfUrl).hostname);
    grantId = grant.id;
    await page.goto(`/knowledge-bases/${kb.id}`);
    await page
      .getByRole("button", { name: /URL hinzufügen|Add URL/, exact: true })
      .click();
    await page
      .getByRole("textbox", { name: /Website-URL|Website URL/ })
      .fill(rootUrl);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /URL hinzufügen|Add URL/, exact: true })
      .click();
    await expect
      .poll(
        async () => {
          const documents =
            await generatedApi.knowledgeBasesControllerListDocuments(kb.id, {
              api,
            });
          return documents.data
            .map((doc) => `${doc.textType}:${doc.status}`)
            .sort();
        },
        { timeout: 60_000 },
      )
      .toEqual(["file:failed", "file:ready", "web:ready"]);
    const documents = await generatedApi.knowledgeBasesControllerListDocuments(
      kb.id,
      { api },
    );
    const file = documents.data.find((doc) => doc.name === "Hauptsatzung");
    const root = documents.data.find((doc) => doc.textType === "web");
    expect(file).toMatchObject({
      textType: "file",
      status: "ready",
      url: pdfUrl,
    });
    if (!root || !file) throw new Error("Crawled sources missing");
    await page.reload();
    await expect(
      page.getByTestId("knowledge-base-documents-card"),
    ).toContainText("Hauptsatzung");
    await expect(
      page.getByTestId("knowledge-base-documents-card"),
    ).toContainText("Broken statute");
    await generatedApi.knowledgeBasesControllerRemoveDocument(kb.id, root.id, {
      api,
    });
    const remaining = await generatedApi.knowledgeBasesControllerListDocuments(
      kb.id,
      { api },
    );
    expect(remaining.data.map((doc) => doc.id).sort()).toEqual(
      documents.data
        .filter((doc) => doc.id !== root.id)
        .map((doc) => doc.id)
        .sort(),
    );

    const chunkId = await citeDiscoveredPdf(page, api, kb.id, pdfUrl);

    const member = await createUser(api, mail, `pdf-recipient-${Date.now()}`);
    const memberApi = await request.newContext({ baseURL: config.apiURL });
    try {
      await login(memberApi, member.email, member.password);
      const defaults =
        await generatedApi.modelsDefaultsControllerGetEffectiveDefaultModel({
          api: memberApi,
        });
      const memberThread = await generatedApi.threadsControllerCreate(
        { modelId: defaults.permittedLanguageModel?.id },
        { api: memberApi },
      );
      expect(
        (
          await getThreadSourceCitationResponse(
            memberApi,
            memberThread.id,
            chunkId,
          )
        ).status(),
      ).toBe(404);
      await generatedApi.sharesControllerCreateKnowledgeBaseShare(
        { entityType: "knowledge_base", knowledgeBaseId: kb.id },
        { api },
      );
      await generatedApi.knowledgeBasesControllerSetActivation(
        kb.id,
        { isActive: true },
        { api: memberApi },
      );
      const allowed = await getThreadSourceCitationResponse(
        memberApi,
        memberThread.id,
        chunkId,
      );
      expect(allowed.status()).toBe(200);
      expect((await allowed.json()).source.url).toBe(pdfUrl);
    } finally {
      await memberApi.dispose();
    }

    const beforeForeignCrawl = pdfRequests;
    await assertForeignOrgDenied(testInfo.outputPath("foreign-org.json"));
    expect(pdfRequests).toBe(beforeForeignCrawl);

    await generatedApi.knowledgeBasesControllerAddUrl(
      kb.id,
      { url: rootUrl, maxDepth: 0 },
      { api },
    );
    await expect
      .poll(
        async () => {
          const recreated =
            await generatedApi.knowledgeBasesControllerListDocuments(kb.id, {
              api,
            });
          return recreated.data
            .map((doc) => `${doc.textType}:${doc.status}`)
            .sort();
        },
        { timeout: 60_000 },
      )
      .toEqual([
        "file:failed",
        "file:failed",
        "file:ready",
        "file:ready",
        "web:ready",
      ]);
    await revokeCrawlDomain(org.orgId, grantId);
    grantId = undefined;
    const beforeRevokedCrawl = pdfRequests;
    await generatedApi.knowledgeBasesControllerAddUrl(
      kb.id,
      { url: rootUrl, maxDepth: 0 },
      { api },
    );
    await waitForDocuments(api, kb.id, [
      "file:failed",
      "file:failed",
      "file:failed",
      "file:failed",
      "file:ready",
      "file:ready",
      "web:ready",
      "web:ready",
    ]);
    expect(pdfRequests).toBe(beforeRevokedCrawl);
  } finally {
    if (grantId) await revokeCrawlDomain(org.orgId, grantId);
    await generatedApi.knowledgeBasesControllerDelete(kb.id, { api });
  }
});

async function citeDiscoveredPdf(
  page: Page,
  api: APIRequestContext,
  knowledgeBaseId: string,
  pdfUrl: string,
): Promise<string> {
  const existing = await generatedApi.knowledgeBasesControllerFindAll(
    { ownerType: "personal", limit: 100 },
    { api },
  );
  const others = existing.data.filter(
    (kb) => kb.isActive && kb.id !== knowledgeBaseId,
  );
  // The citation mock selects the first active knowledge base in this worker.
  for (const kb of others)
    await generatedApi.knowledgeBasesControllerSetActivation(
      kb.id,
      { isActive: false },
      { api },
    );
  try {
    await startThread(page, "Find the municipal statute");
    await sendMessage(page, "E2E cite first source");
    const citation = page.getByTestId("source-citation").last();
    await expect(citation).toBeVisible();
    const chunkId = await citation.getAttribute("data-source-chunk-id");
    if (!chunkId) throw new Error("Citation chunk missing");
    await citation.click();
    await expect(
      page.getByTestId("source-citation-dialog")
        .getByRole("link", { name: pdfUrl, exact: true }),
    ).toHaveAttribute("href", pdfUrl);
    await expect(page.getByTestId("source-citation-excerpt")).not.toBeEmpty();
    return chunkId;
  } finally {
    for (const kb of others)
      await generatedApi.knowledgeBasesControllerSetActivation(
        kb.id,
        { isActive: true },
        { api },
      );
  }
}

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

async function waitForDocuments(
  api: APIRequestContext,
  id: string,
  statuses: string[],
): Promise<void> {
  await expect
    .poll(
      async () => {
        const docs = await generatedApi.knowledgeBasesControllerListDocuments(
          id,
          { api },
        );
        return docs.data.map((doc) => `${doc.textType}:${doc.status}`).sort();
      },
      { timeout: 60_000 },
    )
    .toEqual(statuses);
}

async function assertForeignOrgDenied(storagePath: string): Promise<void> {
  const foreign = await createOrg(
    `private-pdf-foreign-${Date.now()}`,
    storagePath,
  );
  const api = await request.newContext({
    baseURL: config.apiURL,
    storageState: foreign.storageState,
  });
  try {
    await permitEmbeddingModel(api);
    const kb = await generatedApi.knowledgeBasesControllerCreate(
      { ownerType: "personal", name: "Foreign private PDF denial" },
      { api },
    );
    try {
      await generatedApi.knowledgeBasesControllerAddUrl(
        kb.id,
        { url: rootUrl, maxDepth: 0 },
        { api },
      );
      await waitForDocuments(api, kb.id, [
        "file:failed",
        "file:failed",
        "web:ready",
      ]);
    } finally {
      await generatedApi.knowledgeBasesControllerDelete(kb.id, { api });
    }
  } finally {
    await api.dispose();
  }
}
