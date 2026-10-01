import { test, expect } from "../../src/fixtures/test";
import { createUser } from "../../src/factories/user.factory";
import { login } from "../../src/clients/api/auth.client";
import { createCustomIntegration } from "../../src/clients/api/integrations.client";
import {
  addMcpIntegrationToThread,
  createEmptyThread,
  getThread,
} from "../../src/clients/api/threads.client";
import { decideToolApprovalResponse } from "../../src/clients/api/tool-approvals.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import { sendMessage } from "../../src/flows/chat.flow";
import {
  startMcpStubServer,
  type McpStubServer,
} from "../../src/servers/mcp-stub-server";
import { config } from "../../src/config";
import type { ToolUseMessageContentResponseDto } from "../../src/clients/generated/ayunisCoreAPI.schemas";

const APPROVAL_PROMPT = "E2E trigger mcp approval: ";
const MCP_TOOL_NAME = /^mcp__tool__create_document__[0-9a-f]{8}$/;

let stub: McpStubServer;

test.beforeAll(async () => {
  stub = await startMcpStubServer();
});

test.afterAll(async () => {
  await stub.close();
});

async function openThreadWithStubIntegration(
  api: Parameters<typeof createEmptyThread>[0],
  suffix: number,
) {
  const defaultModel =
    await generatedApi.modelsDefaultsControllerGetEffectiveDefaultModel({
      api,
    });
  const permittedModelId = defaultModel.permittedLanguageModel?.id;
  if (!permittedModelId) throw new Error("No default model permitted");
  const integration = await createCustomIntegration(api, {
    name: `Stub Wiki ${suffix}`,
    serverUrl: stub.url,
    configSchema: { authType: "CUSTOM", orgFields: [], userFields: [] },
    orgConfigValues: {},
  });
  const thread = await createEmptyThread(api, permittedModelId);
  await addMcpIntegrationToThread(api, thread.id, integration.id);
  return thread;
}

test("runs an external create_document only after the owner approves it", async ({
  page,
  api,
  mail,
  browser,
}) => {
  const suffix = Date.now();
  const thread = await openThreadWithStubIntegration(api, suffix);
  const callsBefore = stub.calls.length;

  await page.goto(`/chats/${thread.id}`);
  await sendMessage(page, `${APPROVAL_PROMPT}Approved note ${suffix}`);

  const card = page.getByTestId("tool-approval-card");
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("data-tool-call-id", /.+/);
  const toolCallId = await card.evaluate((element) =>
    element.getAttribute("data-tool-call-id"),
  );
  await expect(
    page.locator(
      '[data-testid="timeline-step"][data-step-status="awaiting_approval"]',
    ),
  ).toHaveCount(1);

  // A different member of the org cannot release the owner's pending call.
  const member = await createUser(api, mail, `mcp-approval-${suffix}`);
  const memberContext = await browser.newContext({ baseURL: config.apiURL });
  try {
    await login(memberContext.request, member.email, member.password);
    const denied = await decideToolApprovalResponse(
      memberContext.request,
      thread.id,
      toolCallId!,
      "approved",
    );
    expect(denied.status()).toBe(404);
  } finally {
    await memberContext.close();
  }
  expect(stub.calls).toHaveLength(callsBefore);

  await page.getByTestId("tool-approval-approve").click();

  await expect(page.getByTestId("assistant-message").last()).toContainText(
    "mcp-approval-complete::",
  );
  await expect(card).toHaveCount(0);
  expect(stub.calls.slice(callsBefore)).toEqual([
    {
      name: "create_document",
      arguments: { title: `Approved note ${suffix}` },
    },
  ]);

  const persisted = await getThread(api, thread.id);
  const toolNames = persisted.messages
    .filter((message) => message.role === "assistant")
    .flatMap((message) => message.content)
    .filter(
      (content): content is ToolUseMessageContentResponseDto =>
        content.type === "tool_use",
    )
    .map((content) => content.name);
  expect(toolNames).toHaveLength(1);
  expect(toolNames[0]).toMatch(MCP_TOOL_NAME);
});

test("declining keeps the external tool unexecuted and labels the step", async ({
  page,
  api,
}) => {
  const suffix = Date.now();
  const thread = await openThreadWithStubIntegration(api, suffix);
  const callsBefore = stub.calls.length;

  await page.goto(`/chats/${thread.id}`);
  await sendMessage(page, `${APPROVAL_PROMPT}Declined note ${suffix}`);

  await expect(page.getByTestId("tool-approval-card")).toBeVisible();
  await page.getByTestId("tool-approval-decline").click();

  await expect(page.getByTestId("assistant-message").last()).toContainText(
    "mcp-approval-complete::",
  );
  expect(stub.calls).toHaveLength(callsBefore);

  await page.getByTestId("timeline-activity-toggle").last().click();
  const step = page.locator('[data-testid="timeline-step"]').last();
  await expect(step).toHaveAttribute("data-tool-name", MCP_TOOL_NAME);
  const label = step.getByTestId("timeline-step-label");
  await expect(label).toContainText("Create Document");
  await expect(label).not.toContainText("Create Document verwendet");

  const persisted = await getThread(api, thread.id);
  const declined = persisted.messages
    .filter((message) => message.role === "tool")
    .flatMap((message) => message.content)
    .find((content) => content.outcome === "declined");
  expect(declined?.result).toContain("declined");
});
