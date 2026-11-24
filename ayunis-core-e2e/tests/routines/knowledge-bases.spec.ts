import { randomUUID } from "node:crypto";
import type { APIRequestContext, BrowserContext } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import { permitEmbeddingModel } from "../../src/clients/api/models.client";
import {
  createRoutine,
  finishingRoutine,
  getRoutine,
  listRoutineKnowledgeBases,
  listRoutineThreads,
  requestRoutineLinkAdd,
  requestRoutineLinkRemoval,
  requestRoutineLinks,
  runRoutineNow,
} from "../../src/clients/api/routines.client";
import {
  requestKnowledgeBaseShare,
  requestShareDeletion,
} from "../../src/clients/api/shares.client";
import { getThread } from "../../src/clients/api/threads.client";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import { test, expect } from "../../src/fixtures/test";

const emptySession = { cookies: [], origins: [] };

/** Runs the routine and returns the thread its run created. */
async function runToEnd(api: APIRequestContext, routineId: string) {
  const before = new Set(
    (await listRoutineThreads(api, routineId)).map(({ id }) => id),
  );
  await runRoutineNow(api, routineId);
  await expect
    .poll(async () => (await getRoutine(api, routineId)).lastRunStatus, {
      timeout: 30_000,
    })
    .toBe("succeeded");
  const created = (await listRoutineThreads(api, routineId)).filter(
    ({ id }) => !before.has(id),
  );
  expect(created).toHaveLength(1);
  return getThread(api, created[0].id);
}

const knowledgeBaseIds = async (api: APIRequestContext, routineId: string) =>
  (await listRoutineKnowledgeBases(api, routineId)).map(({ id }) => id);

// Permits an embedding model, so it runs in its own organization.
test("a routine can use another user's knowledge base only while it is shared with its owner", async ({
  browser,
  mail,
}) => {
  test.setTimeout(180_000);
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `routine-kb-${key}`,
    test.info().outputPath("routine-kb-org.json"),
  );
  // The knowledge base's owner; the routine's owner is the member.
  const ownerApi = await createApiContext(emptySession);
  await login(ownerApi, org.admin.email, org.admin.password);
  const { api: memberApi } = await createMemberSession(
    ownerApi,
    mail,
    `routine-kb-${key}`,
  );
  const contexts: BrowserContext[] = [];
  try {
    const routine = await createRoutine(
      memberApi,
      finishingRoutine(`Satzungsänderungen ${key}`),
    );
    const memberContext = await browser.newContext({
      storageState: await memberApi.storageState(),
    });
    contexts.push(memberContext);
    const memberPage = await memberContext.newPage();

    // Without an embedding model there are no knowledge bases to pick.
    await memberPage.goto(`/routines/${routine.id}`);
    await expect(
      memberPage.getByTestId("routine-context-tab-integrations"),
    ).toBeVisible();
    await expect(
      memberPage.getByTestId("routine-context-tab-knowledge-bases"),
    ).toHaveCount(0);

    await permitEmbeddingModel(ownerApi);
    const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
      { ownerType: "personal", name: `Satzungen ${key}`, description: "" },
      { api: ownerApi },
    );
    const knowledgeBaseSwitch = memberPage.getByTestId(
      `routine-knowledge-base-${knowledgeBase.id}`,
    );
    const openKnowledgeBasesTab = async () => {
      await memberPage.goto(`/routines/${routine.id}`);
      await memberPage.getByTestId("routine-context-tab-knowledge-bases").click();
    };

    // Before the share
    expect(
      (
        await requestRoutineLinkAdd(
          memberApi,
          routine.id,
          "knowledge-bases",
          knowledgeBase.id,
        )
      ).status(),
    ).toBe(404);
    expect(await knowledgeBaseIds(memberApi, routine.id)).toEqual([]);
    await openKnowledgeBasesTab();
    await expect(knowledgeBaseSwitch).toHaveCount(0);

    // Shared
    const shareResponse = await requestKnowledgeBaseShare(
      ownerApi,
      knowledgeBase.id,
    );
    expect(shareResponse.ok()).toBe(true);
    const share = (await shareResponse.json()) as { id: string };
    await openKnowledgeBasesTab();
    await knowledgeBaseSwitch.click();
    await expect.poll(() => knowledgeBaseIds(memberApi, routine.id)).toEqual([
      knowledgeBase.id,
    ]);
    const sharedRun = await runToEnd(memberApi, routine.id);
    expect(sharedRun.knowledgeBases.map(({ id }) => id)).toEqual([
      knowledgeBase.id,
    ]);

    // Nobody but the routine's owner reaches its links.
    for (const kind of ["mcp-integrations", "knowledge-bases"] as const) {
      const responses = await Promise.all([
        requestRoutineLinks(ownerApi, routine.id, kind),
        requestRoutineLinkAdd(ownerApi, routine.id, kind, knowledgeBase.id),
        requestRoutineLinkRemoval(ownerApi, routine.id, kind, knowledgeBase.id),
      ]);
      expect(responses.map((response) => response.status())).toEqual([
        404, 404, 404,
      ]);
    }

    // Revoked
    expect((await requestShareDeletion(ownerApi, share.id)).ok()).toBe(true);
    expect(await knowledgeBaseIds(memberApi, routine.id)).toEqual([]);
    const revokedRun = await runToEnd(memberApi, routine.id);
    expect(revokedRun.knowledgeBases).toEqual([]);
    await openKnowledgeBasesTab();
    await expect(knowledgeBaseSwitch).toHaveCount(0);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await memberApi.dispose();
    await ownerApi.dispose();
  }
});
