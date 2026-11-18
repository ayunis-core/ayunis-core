import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { permitEmbeddingModel } from "../../src/clients/api/models.client";
import { markSourceProcessing } from "../../src/clients/database.client";
import { createMemberSession } from "../../src/factories/user.factory";
import { createWorkspaceWithResources } from "../../src/factories/workspace-resources.factory";

let server: Server;
let statutesUrl: string;
let noticeUrl: string;

test.beforeAll(async () => {
  server = createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/html" });
    if (req.url === "/statutes") {
      // localhost is never granted as a crawl domain, so both PDFs fail.
      const pdfBase = `http://localhost:${port()}`;
      res.end(
        `<title>Ortsrecht</title><a href="${pdfBase}/budget.pdf">Haushaltssatzung</a><a href="${pdfBase}/fees.pdf">Gebührensatzung</a>`,
      );
    } else {
      res.end("<title>Bekanntmachung</title><p>Sprechzeiten Mo–Fr</p>");
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, resolve);
  });
  statutesUrl = `http://127.0.0.1:${port()}/statutes`;
  noticeUrl = `http://127.0.0.1:${port()}/notice`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function port(): number {
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing fixture port");
  return address.port;
}

test("removes all failed documents at once, only for members who may remove documents", async ({
  api,
  page,
  mail,
}) => {
  test.setTimeout(180_000);
  await permitEmbeddingModel(api);
  const key = randomUUID().slice(0, 8);
  const workspace = await createWorkspaceWithResources(api, `Satzungen ${key}`);
  const knowledgeBaseId = workspace.knowledgeBaseId;
  const member = await createMemberSession(api, mail, `rm-failed-${key}`);
  try {
    await addUrl(api, knowledgeBaseId, statutesUrl);
    await waitForDocuments(api, knowledgeBaseId, [
      "file:failed",
      "file:failed",
      "web:ready",
    ]);
    const notice = await addUrl(api, knowledgeBaseId, noticeUrl);
    await waitForDocuments(api, knowledgeBaseId, [
      "file:failed",
      "file:failed",
      "web:ready",
      "web:ready",
    ]);
    await markSourceProcessing(notice.id);
    const before = await documents(api, knowledgeBaseId);

    await generatedApi.workspaceMembersControllerAdd(
      workspace.id,
      { userIds: [member.member.id], role: "user" },
      { api },
    );
    const failedId = before.find((doc) => doc.status === "failed")!.id;
    await expect(
      generatedApi.knowledgeBasesControllerRemoveDocument(
        knowledgeBaseId,
        failedId,
        { api: member.api },
      ),
    ).rejects.toThrow(/\(HTTP 403\)/);
    await expect(
      generatedApi.knowledgeBasesControllerRemoveFailedDocuments(
        knowledgeBaseId,
        { api: member.api },
      ),
    ).rejects.toThrow(/\(HTTP 403\)/);
    expect(await documents(api, knowledgeBaseId)).toEqual(before);

    await page.goto(
      `/workspaces/${workspace.id}/knowledge-bases/${knowledgeBaseId}`,
    );
    await page.getByTestId("knowledge-base-remove-failed-documents").click();
    await expect(page.getByRole("dialog")).toContainText("2");
    await page.getByTestId("confirmation-confirm").click();
    await waitForDocuments(api, knowledgeBaseId, [
      "web:processing",
      "web:ready",
    ]);
    await expect(
      page.getByTestId("knowledge-base-remove-failed-documents"),
    ).toHaveCount(0);
    const kept = before.filter((doc) => doc.status !== "failed");
    expect(await documents(api, knowledgeBaseId)).toEqual(kept);

    await addUrl(api, knowledgeBaseId, statutesUrl);
    await waitForDocuments(api, knowledgeBaseId, [
      "file:failed",
      "file:failed",
      "web:processing",
      "web:ready",
      "web:ready",
    ]);
    await generatedApi.workspaceMembersControllerUpdateRole(
      workspace.id,
      member.member.id,
      { role: "manager" },
      { api },
    );
    await generatedApi.knowledgeBasesControllerRemoveFailedDocuments(
      knowledgeBaseId,
      { api: member.api },
    );
    await waitForDocuments(api, knowledgeBaseId, [
      "web:processing",
      "web:ready",
      "web:ready",
    ]);
  } finally {
    await member.api.dispose();
    await generatedApi.workspacesControllerRemove(workspace.id, { api });
  }
});

function addUrl(api: APIRequestContext, knowledgeBaseId: string, url: string) {
  return generatedApi.knowledgeBasesControllerAddUrl(
    knowledgeBaseId,
    { url, maxDepth: 0 },
    { api },
  );
}

async function documents(api: APIRequestContext, knowledgeBaseId: string) {
  const list = await generatedApi.knowledgeBasesControllerListDocuments(
    knowledgeBaseId,
    { api },
  );
  return list.data
    .map(({ id, status }) => ({ id, status }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function waitForDocuments(
  api: APIRequestContext,
  knowledgeBaseId: string,
  statuses: string[],
): Promise<void> {
  await expect
    .poll(
      async () => {
        const list = await generatedApi.knowledgeBasesControllerListDocuments(
          knowledgeBaseId,
          { api },
        );
        return list.data.map((doc) => `${doc.textType}:${doc.status}`).sort();
      },
      { timeout: 60_000 },
    )
    .toEqual(statuses);
}
