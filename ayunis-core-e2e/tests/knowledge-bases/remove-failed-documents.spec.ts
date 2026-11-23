import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { permitEmbeddingModel } from "../../src/clients/api/models.client";
import { markSourceProcessing } from "../../src/clients/database.client";
import { createMemberSession } from "../../src/factories/user.factory";
import { createWorkspaceWithResources } from "../../src/factories/workspace-resources.factory";

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
    await upload(api, knowledgeBaseId, "haushalt.htm", EMPTY_HTML);
    await upload(api, knowledgeBaseId, "gebuehren.htm", EMPTY_HTML);
    await upload(api, knowledgeBaseId, "ortsrecht.txt", "Ortsrecht der Gemeinde");
    const notice = await upload(
      api,
      knowledgeBaseId,
      "bekanntmachung.txt",
      "Sprechzeiten Mo–Fr",
    );
    await waitForDocuments(api, knowledgeBaseId, [
      "failed",
      "failed",
      "ready",
      "ready",
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
    await waitForDocuments(api, knowledgeBaseId, ["processing", "ready"]);
    await expect(
      page.getByTestId("knowledge-base-remove-failed-documents"),
    ).toHaveCount(0);
    const kept = before.filter((doc) => doc.status !== "failed");
    expect(await documents(api, knowledgeBaseId)).toEqual(kept);

    await upload(api, knowledgeBaseId, "haushalt.htm", EMPTY_HTML);
    await waitForDocuments(api, knowledgeBaseId, [
      "failed",
      "processing",
      "ready",
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
    await waitForDocuments(api, knowledgeBaseId, ["processing", "ready"]);
  } finally {
    await member.api.dispose();
    await generatedApi.workspacesControllerRemove(workspace.id, { api });
  }
});

// Extracts to no text, so its processing fails (DOCUMENT_EMPTY).
const EMPTY_HTML = "<html><script>track()</script></html>";

async function upload(
  api: APIRequestContext,
  knowledgeBaseId: string,
  name: string,
  content: string,
): Promise<{ id: string }> {
  const response = await api.post(
    `/api/knowledge-bases/${knowledgeBaseId}/documents`,
    {
      multipart: {
        file: {
          name,
          mimeType: name.endsWith(".htm") ? "text/html" : "text/plain",
          buffer: Buffer.from(content),
        },
      },
    },
  );
  expect(response.ok()).toBe(true);
  return (await response.json()) as { id: string };
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
        return list.data.map((doc) => doc.status).sort();
      },
      { timeout: 60_000 },
    )
    .toEqual(statuses);
}
