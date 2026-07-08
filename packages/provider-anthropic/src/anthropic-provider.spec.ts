import type Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParamsStreaming } from '@anthropic-ai/sdk/resources/messages';
import { describe, expect, it } from 'vitest';

import type { AnthropicCompatibleClient } from './anthropic-provider';
import { createMessagesProvider } from './anthropic-provider';

/** Captures the params of each messages.create call and streams nothing. */
const captureClient = (
  captured: MessageCreateParamsStreaming[],
): AnthropicCompatibleClient => ({
  messages: {
    create: ((params: MessageCreateParamsStreaming) => {
      captured.push(params);
      return Promise.resolve(
        (async function* () {})() as unknown as Anthropic.Messages.MessageStreamEvent,
      );
    }) as unknown as Anthropic['messages']['create'],
  },
});

const drain = async (stream: AsyncIterable<unknown>): Promise<unknown[]> => {
  const chunks: unknown[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
};

describe('createMessagesProvider prompt caching', () => {
  it('sends the system prompt as a cached text block', async () => {
    const captured: MessageCreateParamsStreaming[] = [];
    const provider = createMessagesProvider(
      captureClient(captured),
      'test:model-x',
      'model-x',
      1024,
    );

    await drain(
      provider.stream({
        instructions: 'You are helpful.',
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        ],
        tools: [],
      }),
    );

    expect(captured[0].system).toEqual([
      {
        type: 'text',
        text: 'You are helpful.',
        cache_control: { type: 'ephemeral' },
      },
    ]);
  });

  it('marks the last content block of the conversation as a cache breakpoint', async () => {
    const captured: MessageCreateParamsStreaming[] = [];
    const provider = createMessagesProvider(
      captureClient(captured),
      'test:model-x',
      'model-x',
      1024,
    );

    await drain(
      provider.stream({
        instructions: '',
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'First' }] },
          { role: 'assistant', content: [{ type: 'text', text: 'Reply' }] },
          { role: 'user', content: [{ type: 'text', text: 'Second' }] },
        ],
        tools: [],
      }),
    );

    expect(captured[0].messages).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'First' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Reply' }] },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Second',
            cache_control: { type: 'ephemeral' },
          },
        ],
      },
    ]);
  });
});
