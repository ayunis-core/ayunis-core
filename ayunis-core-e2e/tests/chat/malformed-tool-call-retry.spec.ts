import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import { startThread } from '../../src/flows/chat.flow';

test('recovers from a malformed completed tool call without durable partial output', async ({
  page,
  api,
  org,
}) => {
  const threadId = await startThread(
    page,
    'E2E trigger malformed completed tool call',
  );
  const recoveredReply = `recovered::${org.defaultModel.provider}::${org.defaultModel.name}`;

  await expect(page.getByTestId('assistant-message')).toHaveCount(1);
  await expect(page.getByTestId('assistant-message')).toContainText(
    recoveredReply,
  );

  const thread = await generatedApi.threadsControllerFindOne(threadId, { api });
  const assistantMessages = thread.messages.filter(
    (message) => message.role === 'assistant',
  );
  expect(assistantMessages).toHaveLength(1);
  expect(assistantMessages[0].content).toEqual([
    expect.objectContaining({ type: 'text', text: recoveredReply }),
  ]);
});
