import { createHash } from 'node:crypto';
import type { Page } from '@playwright/test';
import {
  getThread,
  uploadLegacyThreadPdf,
} from '../../src/clients/api/threads.client';
import { permitEmbeddingModel } from '../../src/clients/api/models.client';
import {
  createEchoMcpIntegration,
  createThreadWithMcpIntegration,
} from '../../src/factories/mcp-integration.factory';
import { createPdf } from '../../src/factories/pdf.factory';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';
import { sendMessage } from '../../src/flows/chat.flow';
import {
  confirmToolCall,
  toolConfirmationCard,
} from '../../src/flows/tool-confirmation.flow';
import { MCP_ECHO_FILE_PROMPT } from '../../src/servers/echo-mcp.server';

const PDF_NAME = 'Bauantrag Müller.pdf';

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

// Sends the file call and confirms it; resolves with the SSE stream of the
// run the confirmation continued.
async function callEchoFile(page: Page, sourceId: string): Promise<string> {
  await sendMessage(page, `${MCP_ECHO_FILE_PROMPT}${sourceId}`);
  await expect(toolConfirmationCard(page)).toHaveAttribute(
    'data-state',
    'pending',
  );
  const run = page.waitForResponse((response) =>
    response.url().endsWith('/api/runs/send-message'),
  );
  await confirmToolCall(page);
  await expect(page.getByTestId('assistant-message').last()).toContainText(
    'mcp-tool-result::',
  );
  return (await run).text();
}

test("hands an attached chat file to an MCP tool, for the file's own chat only", async ({
  page,
  api,
  browser,
  mail,
  echoMcpServer,
}) => {
  test.setTimeout(120_000);
  await permitEmbeddingModel(api);
  const integration = await createEchoMcpIntegration(api, echoMcpServer);
  const threadId = await createThreadWithMcpIntegration(api, integration.id);
  const pdf = createPdf(`Bauantrag ${Date.now()}`, 'AYC-1882');

  await page.goto(`/chats/${threadId}`);
  await page.getByTestId('chat-file-upload-input').setInputFiles({
    name: PDF_NAME,
    mimeType: 'application/pdf',
    buffer: pdf,
  });
  await expect(page.getByTestId('chat-source')).toHaveCount(1);
  await expect
    .poll(async () => (await getThread(api, threadId)).sources.length)
    .toBe(1);
  const sourceId = (await getThread(api, threadId)).sources[0].id;

  const { api: memberApi } = await createMemberSession(
    api,
    mail,
    `mcp-file-${Date.now()}`,
  );
  const memberContext = await browser.newContext({
    storageState: await memberApi.storageState(),
  });
  try {
    const memberPage = await memberContext.newPage();
    await memberPage.goto(
      `/chats/${await createThreadWithMcpIntegration(memberApi, integration.id)}`,
    );
    await callEchoFile(memberPage, sourceId);
    await expect(
      memberPage.getByTestId('assistant-message').last(),
    ).toContainText(`'${sourceId}' is not a file of this chat`);
    expect(echoMcpServer.fileCalls).toEqual([]);
  } finally {
    await memberContext.close();
    await memberApi.dispose();
  }

  const stream = await callEchoFile(page, sourceId);
  await expect(page.getByTestId('assistant-message').last()).toContainText(
    `mcp-tool-result::echo-file::${sha256(pdf)}::${sourceId}::${PDF_NAME}`,
  );
  expect(echoMcpServer.fileCalls).toEqual([
    expect.objectContaining({
      fileId: sourceId,
      fileName: PDF_NAME,
      mimeType: 'application/pdf',
      sha256: sha256(pdf),
    }),
  ]);

  const { downloadUrl } = echoMcpServer.fileCalls[0];
  const persisted = JSON.stringify(await getThread(api, threadId));
  expect(persisted).toContain(sourceId);
  expect(stream).toContain(sourceId);
  for (const exposed of [persisted, stream]) {
    expect(exposed).not.toContain(downloadUrl);
    expect(exposed).not.toContain('X-Amz-Signature');
  }
});

test('refuses files of another chat and files without a stored original, without calling the MCP server', async ({
  page,
  api,
  echoMcpServer,
}) => {
  await permitEmbeddingModel(api);
  const integration = await createEchoMcpIntegration(api, echoMcpServer);
  const otherThreadId = await createThreadWithMcpIntegration(
    api,
    integration.id,
  );
  const otherChatSourceId = await uploadLegacyThreadPdf(
    api,
    otherThreadId,
    'Haushaltsplan.pdf',
    createPdf('Haushaltsplan', 'AYC-1882'),
  );
  const threadId = await createThreadWithMcpIntegration(api, integration.id);
  const legacySourceId = await uploadLegacyThreadPdf(
    api,
    threadId,
    'Satzung.pdf',
    createPdf('Satzung', 'AYC-1882'),
  );

  await page.goto(`/chats/${threadId}`);
  await callEchoFile(page, otherChatSourceId);
  await expect(page.getByTestId('assistant-message').last()).toContainText(
    `'${otherChatSourceId}' is not a file of this chat`,
  );
  await callEchoFile(page, legacySourceId);
  await expect(page.getByTestId('assistant-message').last()).toContainText(
    `File '${legacySourceId}' has no stored original`,
  );
  expect(echoMcpServer.fileCalls).toEqual([]);
});
