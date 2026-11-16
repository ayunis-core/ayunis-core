import { test, expect } from "../../src/fixtures/test";
import {
  createCustomIntegration,
  setUserIntegrationConfig,
  listAvailableIntegrations,
} from "../../src/clients/api/integrations.client";
import { attachMcpIntegration } from "../../src/clients/api/threads.client";
import {
  createEchoMcpIntegration,
  createThreadWithMcpIntegration,
} from "../../src/factories/mcp-integration.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import { sendMessage } from "../../src/flows/chat.flow";
import { confirmToolCall } from "../../src/flows/tool-confirmation.flow";
import {
  startEchoMcpServer,
  MCP_ECHO_PROMPT,
} from "../../src/servers/echo-mcp.server";

test("shows a revoked personal MCP connection without breaking another user or working tools", async ({
  page,
  api,
  mail,
  echoMcpServer,
}) => {
  const personal = await startEchoMcpServer();
  const member = await createMemberSession(
    api,
    mail,
    `mcp-health-${Date.now()}`,
  );
  const token = `owner-${Date.now()}`;
  const memberToken = `member-${Date.now()}`;
  personal.setAcceptedToken([token, memberToken]);
  try {
    const integration = await createCustomIntegration(api, {
      name: `Personal finance ${Date.now()}`,
      serverUrl: personal.url,
      configSchema: {
        authType: "CUSTOM",
        orgFields: [],
        userFields: [
          {
            key: "personalToken",
            label: "Personal token",
            type: "secret",
            headerName: "Authorization",
            prefix: "Bearer ",
            required: true,
          },
        ],
      },
      orgConfigValues: {},
    });
    await setUserIntegrationConfig(api, integration.id, {
      configValues: { personalToken: token },
    });
    await setUserIntegrationConfig(member.api, integration.id, {
      configValues: { personalToken: memberToken },
    });
    const working = await createEchoMcpIntegration(api, echoMcpServer);
    const thread = await createThreadWithMcpIntegration(api, integration.id);
    await attachMcpIntegration(api, thread, working.id);
    personal.setAcceptedToken(memberToken);
    await page.goto(`/chats/${thread}`);
    const text = `working-tool-${Date.now()}`;
    await sendMessage(page, `${MCP_ECHO_PROMPT}${text}`);
    await expect(page.getByRole("region")).toContainText(integration.name);
    await confirmToolCall(page);
    await expect(page.getByTestId("assistant-message").last()).toContainText(
      `mcp-tool-result::echo::${text}`,
    );
    expect(echoMcpServer.calls).toEqual([text]);
    expect(personal.calls).toEqual([]);

    await expect
      .poll(
        async () =>
          (await listAvailableIntegrations(api)).find(
            (value) => value.id === integration.id,
          )?.userConnectionFailure,
      )
      .toBe("rejected");
    await page.goto("/settings/integrations");
    await expect(
      page.getByTestId(`integration-failure-${integration.id}`),
    ).toBeVisible();
    expect(
      (await listAvailableIntegrations(member.api)).find(
        (value) => value.id === integration.id,
      )?.userConnectionFailure,
    ).toBeUndefined();

    const memberThread = await createThreadWithMcpIntegration(
      member.api,
      integration.id,
    );
    const memberPage = await page
      .context()
      .browser()!
      .newPage({
        baseURL: page.url(),
        storageState: await member.api.storageState(),
      });
    try {
      await memberPage.goto(`/chats/${memberThread}`);
      await sendMessage(memberPage, `${MCP_ECHO_PROMPT}member-still-works`);
      await confirmToolCall(memberPage);
      await expect(
        memberPage.getByTestId("assistant-message").last(),
      ).toContainText("mcp-tool-result::echo::member-still-works");
    } finally {
      await memberPage.close();
    }

    const replacement = `replacement-${Date.now()}`;
    personal.setAcceptedToken([replacement, memberToken]);
    await page.getByTestId(`integration-configure-${integration.id}`).click();
    await page.getByTestId("user-config-personalToken").fill(replacement);
    await page.getByTestId("user-config-save").click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByTestId(`integration-failure-${integration.id}`),
    ).toBeHidden();
    const reconnected = await createThreadWithMcpIntegration(
      api,
      integration.id,
    );
    await page.goto(`/chats/${reconnected}`);
    await sendMessage(page, `${MCP_ECHO_PROMPT}owner-reconnected`);
    await confirmToolCall(page);
    await expect(page.getByTestId("assistant-message").last()).toContainText(
      "mcp-tool-result::echo::owner-reconnected",
    );
    expect(personal.calls).toEqual(["member-still-works", "owner-reconnected"]);
    await sendMessage(page, `${MCP_ECHO_PROMPT}revoked-after-discovery`);
    personal.setAcceptedToken(memberToken);
    await confirmToolCall(page);
    await expect(page.getByRole("region")).toContainText(integration.name);
    await expect(page.getByTestId("assistant-message").last()).toContainText(
      "mcp-tool-result::",
    );
    await expect
      .poll(
        async () =>
          (await listAvailableIntegrations(api)).find(
            (value) => value.id === integration.id,
          )?.userConnectionFailure,
      )
      .toBe("rejected");
    expect(personal.calls).toEqual(["member-still-works", "owner-reconnected"]);
  } finally {
    await member.api.dispose();
    await personal.close();
  }
});

test("reports an incompatible HTML response as a personal connection failure", async ({
  page,
  api,
}) => {
  const personal = await startEchoMcpServer();
  personal.setAcceptedToken("html-response-token");
  try {
    const integration = await createCustomIntegration(api, {
      name: `HTML response ${Date.now()}`,
      serverUrl: personal.url,
      configSchema: {
        authType: "CUSTOM",
        orgFields: [],
        userFields: [
          {
            key: "personalToken",
            label: "Personal token",
            type: "secret",
            headerName: "Authorization",
            prefix: "Bearer ",
            required: true,
          },
        ],
      },
      orgConfigValues: {},
    });
    await setUserIntegrationConfig(api, integration.id, {
      configValues: { personalToken: "html-response-token" },
    });
    const thread = await createThreadWithMcpIntegration(api, integration.id);
    personal.setHtmlResponse(true);
    await page.goto(`/chats/${thread}`);
    await sendMessage(page, "Check the integration connection");
    await expect(page.getByRole("region")).toContainText(integration.name);
    await expect
      .poll(
        async () =>
          (await listAvailableIntegrations(api)).find(
            (value) => value.id === integration.id,
          )?.userConnectionFailure,
      )
      .toBe("invalidResponse");
    await expect(page.getByTestId("assistant-message").last()).toBeVisible();
    await expect(page.getByRole("region")).not.toContainText(
      "private-upstream-response",
    );
    await expect(
      page.getByTestId("assistant-message").last(),
    ).not.toContainText("private-upstream-response");
    await page.goto("/settings/integrations");
    await expect(
      page.getByTestId(`integration-failure-${integration.id}`),
    ).toBeVisible();
  } finally {
    await personal.close();
  }
});
