import {
  createEchoMcpIntegration,
  createThreadWithMcpIntegration,
} from '../../src/factories/mcp-integration.factory';
import { expect, test } from '../../src/fixtures/test';
import { sendMessage } from '../../src/flows/chat.flow';
import { MCP_ECHO_PROMPT } from '../../src/servers/echo-mcp.server';

test('a chat runs an MCP tool without confirmation and answers with its result', async ({
  page,
  api,
  echoMcpServer,
}) => {
  const integration = await createEchoMcpIntegration(api, echoMcpServer);
  const threadId = await createThreadWithMcpIntegration(api, integration.id);
  const text = `Ratssitzung ${Date.now()}`;

  await page.goto(`/chats/${threadId}`);
  await sendMessage(page, `${MCP_ECHO_PROMPT}${text}`);

  await expect(page.getByTestId('assistant-message').last()).toContainText(
    `mcp-tool-result::echo::${text}`,
  );
  expect(echoMcpServer.calls).toEqual([text]);
});
