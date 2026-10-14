import { getEffectiveDefaultModel } from '../../src/clients/api/models.client';
import {
  createEmptyThread,
  getThread,
  sendThreadMessage,
} from '../../src/clients/api/threads.client';
import { expect, test } from '../../src/fixtures/test';

// Two sends on one thread at the same moment used to interleave their runs;
// a failing run then deleted the other run's messages (AYC-1259).
test('two messages sent to one thread at once are answered one after the other', async ({
  api,
}) => {
  const defaultModel = await getEffectiveDefaultModel(api);
  expect(defaultModel).not.toBeNull();
  const thread = await createEmptyThread(api, defaultModel?.id ?? '');

  const responses = await Promise.all([
    sendThreadMessage(api, thread.id, 'First question'),
    sendThreadMessage(api, thread.id, 'Second question'),
  ]);

  for (const response of responses) {
    expect(response.ok()).toBe(true);
    expect(await response.text()).not.toContain('"type":"error"');
  }
  const { messages } = await getThread(api, thread.id);
  expect(messages.map((message) => message.role)).toEqual([
    'user',
    'assistant',
    'user',
    'assistant',
  ]);
});
