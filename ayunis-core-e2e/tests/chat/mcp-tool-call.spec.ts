import {
  createEchoMcpIntegration,
  createThreadWithMcpIntegration,
} from '../../src/factories/mcp-integration.factory';
import { expect, test } from '../../src/fixtures/test';
import { sendMessage } from '../../src/flows/chat.flow';
import {
  confirmToolCall,
  rejectToolCall,
  toolConfirmationCard,
} from '../../src/flows/tool-confirmation.flow';
import { MCP_ECHO_PROMPT } from '../../src/servers/echo-mcp.server';

// The result the backend gives the model for a rejected call; the mock model
// echoes plain-text results unchanged.
const REJECTION = 'The user rejected this tool call.';

test('a chat runs an MCP tool only after the user confirms it', async ({
  page,
  api,
  echoMcpServer,
}) => {
  const integration = await createEchoMcpIntegration(api, echoMcpServer);
  const threadId = await createThreadWithMcpIntegration(api, integration.id);
  const text = `Ratssitzung ${Date.now()}`;

  await page.goto(`/chats/${threadId}`);
  await sendMessage(page, `${MCP_ECHO_PROMPT}${text}`);

  const card = toolConfirmationCard(page);
  await expect(card).toHaveAttribute('data-state', 'pending');
  await expect(card).toContainText('echo');
  await expect(card).toContainText(text);
  expect(echoMcpServer.calls).toEqual([]);

  await page.reload();
  await expect(toolConfirmationCard(page)).toHaveAttribute(
    'data-state',
    'pending',
  );
  expect(echoMcpServer.calls).toEqual([]);

  await confirmToolCall(page);

  await expect(page.getByTestId('assistant-message').last()).toContainText(
    `mcp-tool-result::echo::${text}`,
  );
  expect(echoMcpServer.calls).toEqual([text]);
  await page.reload();
  await expect(toolConfirmationCard(page)).toHaveAttribute(
    'data-state',
    'confirmed',
  );
});

test('a rejected MCP call never runs and the model learns it was rejected', async ({
  page,
  api,
  echoMcpServer,
}) => {
  const integration = await createEchoMcpIntegration(api, echoMcpServer);
  const threadId = await createThreadWithMcpIntegration(api, integration.id);

  await page.goto(`/chats/${threadId}`);
  await sendMessage(page, `${MCP_ECHO_PROMPT}Haushaltsplan ${Date.now()}`);
  await rejectToolCall(page);

  await expect(page.getByTestId('assistant-message').last()).toContainText(
    `mcp-tool-result::${REJECTION}`,
  );
  await expect(toolConfirmationCard(page)).toHaveAttribute(
    'data-state',
    'rejected',
  );
  expect(echoMcpServer.calls).toEqual([]);
});

test('sending a message instead of deciding rejects the pending MCP call', async ({
  page,
  api,
  org,
  echoMcpServer,
}) => {
  const integration = await createEchoMcpIntegration(api, echoMcpServer);
  const threadId = await createThreadWithMcpIntegration(api, integration.id);

  await page.goto(`/chats/${threadId}`);
  await sendMessage(page, `${MCP_ECHO_PROMPT}Bauantrag ${Date.now()}`);
  await expect(toolConfirmationCard(page)).toHaveAttribute(
    'data-state',
    'pending',
  );

  await sendMessage(page, 'Lieber doch nicht, danke.');

  await expect(page.getByTestId('assistant-message').last()).toContainText(
    `${org.defaultModel.provider}::${org.defaultModel.name}`,
  );
  await expect(toolConfirmationCard(page)).toHaveAttribute(
    'data-state',
    'rejected',
  );
  expect(echoMcpServer.calls).toEqual([]);
});
