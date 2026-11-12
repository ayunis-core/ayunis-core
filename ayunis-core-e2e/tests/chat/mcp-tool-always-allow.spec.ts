import type { Page } from '@playwright/test';
import {
  createEchoMcpIntegration,
  createThreadWithMcpIntegration,
} from '../../src/factories/mcp-integration.factory';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';
import { sendMessage } from '../../src/flows/chat.flow';
import {
  confirmToolCall,
  toolConfirmationCard,
} from '../../src/flows/tool-confirmation.flow';
import { MCP_ECHO_PROMPT } from '../../src/servers/echo-mcp.server';

async function callEcho(page: Page, threadId: string, text: string) {
  await page.goto(`/chats/${threadId}`);
  await sendMessage(page, `${MCP_ECHO_PROMPT}${text}`);
}

test('an always-allowed MCP tool runs without asking until the user removes it in settings', async ({
  page,
  api,
  echoMcpServer,
}) => {
  const integration = await createEchoMcpIntegration(api, echoMcpServer);
  const first = `Gemeinderat ${Date.now()}`;
  await callEcho(
    page,
    await createThreadWithMcpIntegration(api, integration.id),
    first,
  );
  await confirmToolCall(page, { alwaysAllow: true });
  await expect(page.getByTestId('assistant-message').last()).toContainText(
    `mcp-tool-result::echo::${first}`,
  );

  const second = `Bauausschuss ${Date.now()}`;
  await callEcho(
    page,
    await createThreadWithMcpIntegration(api, integration.id),
    second,
  );
  await expect(page.getByTestId('assistant-message').last()).toContainText(
    `mcp-tool-result::echo::${second}`,
  );
  await expect(page.getByTestId('tool-confirmation')).toHaveCount(0);
  expect(echoMcpServer.calls).toEqual([first, second]);

  await page.goto('/settings/integrations');
  const allowance = page.getByTestId(
    `always-allowed-tool-${integration.id}-echo`,
  );
  await allowance.getByTestId('always-allowed-tool-remove').click();
  await expect(allowance).toHaveCount(0);

  await callEcho(
    page,
    await createThreadWithMcpIntegration(api, integration.id),
    `Kreistag ${Date.now()}`,
  );
  await expect(toolConfirmationCard(page)).toHaveAttribute(
    'data-state',
    'pending',
  );
  expect(echoMcpServer.calls).toEqual([first, second]);
});

test("one user's always-allowed MCP tool still asks another user", async ({
  page,
  api,
  browser,
  mail,
  echoMcpServer,
}) => {
  test.setTimeout(90_000);
  const integration = await createEchoMcpIntegration(api, echoMcpServer);
  const { api: memberApi } = await createMemberSession(
    api,
    mail,
    `mcp-allow-${Date.now()}`,
  );
  const memberContext = await browser.newContext({
    storageState: await memberApi.storageState(),
  });
  try {
    const adminText = `Haushalt ${Date.now()}`;
    await callEcho(
      page,
      await createThreadWithMcpIntegration(api, integration.id),
      adminText,
    );
    await confirmToolCall(page, { alwaysAllow: true });
    await expect(page.getByTestId('assistant-message').last()).toContainText(
      `mcp-tool-result::echo::${adminText}`,
    );
    const allowedText = `Haushalt erlaubt ${Date.now()}`;
    await callEcho(
      page,
      await createThreadWithMcpIntegration(api, integration.id),
      allowedText,
    );
    await expect(page.getByTestId('assistant-message').last()).toContainText(
      `mcp-tool-result::echo::${allowedText}`,
    );

    const memberPage = await memberContext.newPage();
    await callEcho(
      memberPage,
      await createThreadWithMcpIntegration(memberApi, integration.id),
      `Mitglied ${Date.now()}`,
    );

    await expect(toolConfirmationCard(memberPage)).toHaveAttribute(
      'data-state',
      'pending',
    );
    expect(echoMcpServer.calls).toEqual([adminText, allowedText]);
  } finally {
    await memberContext.close();
    await memberApi.dispose();
  }
});
