import type { APIRequestContext } from "@playwright/test";
import {
  createCustomIntegration,
  disableIntegration,
} from "../../src/clients/api/integrations.client";
import {
  getRoutine,
  listRoutineIntegrations,
  listRoutineThreads,
  requestRoutineLinkAdd,
  runRoutineNow,
} from "../../src/clients/api/routines.client";
import { getThread } from "../../src/clients/api/threads.client";
import { FakeMcpServer } from "../../src/clients/fake-mcp-server";
import { createBlankRoutine } from "../../src/flows/routines.flow";
import { test, expect } from "../../src/fixtures/test";

const mcpServer = new FakeMcpServer();

test.beforeEach(async () => {
  await mcpServer.start();
});

test.afterEach(async () => {
  await mcpServer.stop();
});

async function runToEnd(
  api: APIRequestContext,
  routineId: string,
  status: "succeeded" | "failed",
): Promise<void> {
  await runRoutineNow(api, routineId);
  await expect
    .poll(async () => (await getRoutine(api, routineId)).lastRunStatus, {
      timeout: 30_000,
    })
    .toBe(status);
}

const integrationIds = async (api: APIRequestContext, routineId: string) =>
  (await listRoutineIntegrations(api, routineId)).map(({ id }) => id);

test("a routine runs with the integration switched on in its Context card, and fails once that integration is disabled until it is switched off", async ({
  api,
  page,
}) => {
  test.setTimeout(120_000);
  const name = `Tickets ${Date.now()}`;
  const integration = await createCustomIntegration(api, {
    name: `Ticketsystem ${Date.now()}`,
    serverUrl: mcpServer.url,
    configSchema: { authType: "CUSTOM", orgFields: [], userFields: [] },
    orgConfigValues: {},
  });

  await page.goto("/routines");
  const routineId = await createBlankRoutine(page, {
    name,
    prompt: `E2E finish routine: ${name}`,
  });
  expect(await getRoutine(api, routineId)).toMatchObject({
    internetAccess: "off",
    modelId: null,
    enabled: true,
  });

  const integrationSwitch = page.getByTestId(
    `routine-integration-${integration.id}`,
  );
  await integrationSwitch.click();
  await expect.poll(() => integrationIds(api, routineId)).toEqual([
    integration.id,
  ]);

  await runToEnd(api, routineId, "succeeded");
  const [routineThread] = await listRoutineThreads(api, routineId);
  const thread = await getThread(api, routineThread.id);
  expect(thread.mcpIntegrations.map(({ id }) => id)).toEqual([integration.id]);
  expect(mcpServer.methods).toContain("tools/list");

  await disableIntegration(api, integration.id);
  await runToEnd(api, routineId, "failed");
  expect((await getRoutine(api, routineId)).lastRunFailureReason).toBe(
    "ROUTINE_INTEGRATION_UNAVAILABLE",
  );

  await page.reload();
  await expect(integrationSwitch).toBeChecked();
  await integrationSwitch.click();
  await expect.poll(() => integrationIds(api, routineId)).toEqual([]);
  await runToEnd(api, routineId, "succeeded");

  // Adding it back is refused while it is disabled, and nothing is stored.
  const response = await requestRoutineLinkAdd(
    api,
    routineId,
    "mcp-integrations",
    integration.id,
  );
  expect(response.status()).toBe(422);
  expect(await response.json()).toMatchObject({
    code: "ROUTINE_INTEGRATION_UNAVAILABLE",
  });
  expect(await integrationIds(api, routineId)).toEqual([]);
});
