import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParamsStreaming } from '@anthropic-ai/sdk/resources/messages';
import { describe, expect, it } from 'vitest';

import { ModelProviderError } from '@ayunis/inference';

import type { AnthropicCompatibleClient } from './anthropic-provider';
import { createMessagesProvider } from './anthropic-provider';
import { asApiPromise, events } from './test-helpers';

/** Captures the params of each messages.create call and streams nothing. */
const captureClient = (
  captured: MessageCreateParamsStreaming[],
): AnthropicCompatibleClient => ({
  messages: {
    create: ((params: MessageCreateParamsStreaming) => {
      captured.push(params);
      return asApiPromise(events());
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

describe('createMessagesProvider tool input streaming', () => {
  const sentTools = async (model: string) => {
    const captured: MessageCreateParamsStreaming[] = [];
    const provider = createMessagesProvider(
      captureClient(captured),
      `test:${model}`,
      model,
      1024,
    );
    await drain(
      provider.stream({
        instructions: '',
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        tools: [
          {
            name: 'create_document',
            description: 'Create a document',
            parameters: { type: 'object', properties: {} },
          },
        ],
      }),
    );
    return captured[0].tools;
  };

  it.each([
    'eu.anthropic.claude-opus-5-5',
    'eu.anthropic.claude-sonnet-5',
    'eu.anthropic.claude-opus-4-6-v1',
    'eu.anthropic.claude-sonnet-4-6',
    'eu.anthropic.claude-haiku-4-5-20251001-v1:0',
    'claude-opus-5-5',
  ])('streams tool input eagerly for %s', async (model) => {
    expect(await sentTools(model)).toEqual([
      expect.objectContaining({ eager_input_streaming: true }),
    ]);
  });

  // Bedrock rejects the field on these deployments with a 400.
  it.each([
    'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
    'eu.anthropic.claude-opus-4-5-20251101-v1:0',
    'anthropic.claude-sonnet-4-20250514-v1:0',
  ])('omits eager tool input streaming for %s', async (model) => {
    expect(await sentTools(model)).toEqual([
      expect.not.objectContaining({ eager_input_streaming: true }),
    ]);
  });
});

describe('createMessagesProvider thinking display', () => {
  const capturedParamsFor = async (
    model: string,
  ): Promise<MessageCreateParamsStreaming> => {
    const captured: MessageCreateParamsStreaming[] = [];
    const provider = createMessagesProvider(
      captureClient(captured),
      `test:${model}`,
      model,
      1024,
    );
    await drain(
      provider.stream({
        instructions: '',
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        tools: [],
      }),
    );
    return captured[0];
  };

  it.each([
    'claude-opus-5-5',
    'claude-opus-5',
    'claude-sonnet-5-5',
    'claude-sonnet-5',
    'eu.anthropic.claude-opus-5-5',
    'anthropic.claude-sonnet-5-5-v1:0',
  ])(
    'requests summarized thinking for %s, which thinks by default',
    async (model) => {
      expect((await capturedParamsFor(model)).thinking).toEqual({
        type: 'adaptive',
        display: 'summarized',
      });
    },
  );

  it.each([
    'claude-sonnet-4-6',
    'eu.anthropic.claude-sonnet-4-6',
    'claude-opus-4-8',
    'claude-sonnet-4-5',
    'claude-haiku-4-5',
    'claude-opus-50',
    'arn:aws:bedrock:eu-central-1:123:application-inference-profile/abc',
  ])('leaves thinking unset for %s', async (model) => {
    expect((await capturedParamsFor(model)).thinking).toBeUndefined();
  });
});

const scriptedClient = (
  stream: AsyncIterable<unknown>,
): AnthropicCompatibleClient => ({
  messages: {
    create: (() =>
      asApiPromise(stream)) as unknown as Anthropic['messages']['create'],
  },
});

const emptyRequest = {
  instructions: '',
  messages: [],
  tools: [],
};

describe('createMessagesProvider stream events', () => {
  it('yields an empty heartbeat chunk for each ping so silent thinking stays visible to idle watchdogs', async () => {
    const provider = createMessagesProvider(
      scriptedClient(
        events(
          { type: 'ping' },
          { type: 'ping' },
          {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: 'answer' },
          },
        ),
      ),
      'test:model-x',
      'model-x',
      1024,
    );

    await expect(drain(provider.stream(emptyRequest))).resolves.toEqual([
      {},
      {},
      { textDelta: 'answer' },
    ]);
  });

  it('surfaces an SSE error event as a stream-consumption provider error', async () => {
    const provider = createMessagesProvider(
      scriptedClient(
        events({
          type: 'error',
          error: { type: 'overloaded_error', message: 'Overloaded' },
        }),
      ),
      'test:model-x',
      'model-x',
      1024,
    );

    const failure = drain(provider.stream(emptyRequest));

    await expect(failure).rejects.toBeInstanceOf(ModelProviderError);
    await expect(failure).rejects.toMatchObject({
      stage: 'stream_consumption',
    });
  });
});

describe('createMessagesProvider over the real SDK client', () => {
  it('rejects an HTTP error response at stream establishment instead of reading it as SSE', async () => {
    const client = new Anthropic({
      apiKey: 'test',
      maxRetries: 0,
      fetch: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              type: 'error',
              error: { type: 'overloaded_error', message: 'Overloaded' },
            }),
            { status: 529, headers: { 'content-type': 'application/json' } },
          ),
        ),
    });
    const provider = createMessagesProvider(
      client,
      'test:model-x',
      'model-x',
      1024,
    );

    await expect(drain(provider.stream(emptyRequest))).rejects.toMatchObject({
      stage: 'stream_establishment',
      upstreamStatus: 529,
    });
  });
});
