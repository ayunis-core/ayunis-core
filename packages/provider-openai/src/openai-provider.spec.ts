import { describe, expect, it, vi } from 'vitest';

import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';

import { azure, openai } from './openai-provider';

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock('openai', () => {
  class FakeOpenAI {
    chat = { completions: { create: createMock } };
  }
  return { default: FakeOpenAI, OpenAI: FakeOpenAI, AzureOpenAI: FakeOpenAI };
});

/**
 * Builds a fake OpenAI stream that records how many chunks the consumer
 * pulled, so a test can assert the loop stopped early instead of draining.
 */
function fakeStream(chunks: unknown[], onPull: () => void) {
  let i = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        next() {
          onPull();
          if (i >= chunks.length) {
            return Promise.resolve({ done: true, value: undefined });
          }
          return Promise.resolve({ done: false, value: chunks[i++] });
        },
        return() {
          return Promise.resolve({ done: true, value: undefined });
        },
      };
    },
  };
}

function makeRequest(): ProviderRequest {
  return { instructions: '', messages: [], tools: [] };
}

describe('openai', () => {
  it('names the provider openai:<model> and exposes a stream function', () => {
    const provider = openai({ apiKey: 'sk-test', model: 'gpt-4.1' });
    expect(provider.name).toBe('openai:gpt-4.1');
    expect(typeof provider.stream).toBe('function');
  });

  it('accepts a custom baseUrl (OpenAI-compatible endpoint)', () => {
    const provider = openai({
      apiKey: 'sk-test',
      model: 'llama-3.3-70b',
      baseUrl: 'https://api.scaleway.ai/v1',
    });
    expect(provider.name).toBe('openai:llama-3.3-70b');
  });
});

describe('azure', () => {
  it('names the provider azure:<deployment> and exposes a stream function', () => {
    const provider = azure({
      apiKey: 'azure-test',
      endpoint: 'https://my-resource.openai.azure.com',
      apiVersion: '2024-10-21',
      model: 'gpt-4o-deployment',
    });
    expect(provider.name).toBe('azure:gpt-4o-deployment');
    expect(typeof provider.stream).toBe('function');
  });
});

describe('streamChat', () => {
  it('stops reading after finish_reason + usage and never consumes the trailing terminator', async () => {
    const content = {
      choices: [{ index: 0, delta: { content: 'hi' }, finish_reason: null }],
    };
    const finish = {
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
    };
    const usage = {
      choices: [],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    };
    // A trailing chunk that, if consumed, would leak into the output. It must
    // never be read — the loop should exit after the usage chunk above.
    const leak = {
      choices: [{ index: 0, delta: { content: 'LEAK' }, finish_reason: null }],
    };

    let pulls = 0;
    createMock.mockReturnValue(
      fakeStream([content, finish, usage, leak], () => {
        pulls++;
      }),
    );

    const provider = openai({ apiKey: 'sk-test', model: 'gpt-5' });
    const out: ProviderChunk[] = [];
    for await (const chunk of provider.stream(makeRequest())) {
      out.push(chunk);
    }

    expect(out).toEqual([
      { textDelta: 'hi' },
      { finishReason: 'stop' },
      { usage: { inputTokens: 10, outputTokens: 5 } },
    ]);
    expect(out.some((c) => c.textDelta === 'LEAK')).toBe(false);
    // content + finish + usage = 3 pulls; the trailing terminator is never read.
    expect(pulls).toBe(3);
  });

  it('exits early even when the finish reason maps to null (unrecognized reason)', async () => {
    const content = {
      choices: [{ index: 0, delta: { content: 'hi' }, finish_reason: null }],
    };
    // convertChunk maps an unrecognized finish_reason to finishReason: null.
    // The early exit must still fire — it keys off the raw chunk, not the map.
    const finish = {
      choices: [{ index: 0, delta: {}, finish_reason: 'some_future_reason' }],
    };
    const usage = {
      choices: [],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    };
    const leak = {
      choices: [{ index: 0, delta: { content: 'LEAK' }, finish_reason: null }],
    };

    let pulls = 0;
    createMock.mockReturnValue(
      fakeStream([content, finish, usage, leak], () => {
        pulls++;
      }),
    );

    const provider = openai({ apiKey: 'sk-test', model: 'gpt-5' });
    const out: ProviderChunk[] = [];
    for await (const chunk of provider.stream(makeRequest())) {
      out.push(chunk);
    }

    expect(out.some((c) => c.textDelta === 'LEAK')).toBe(false);
    expect(pulls).toBe(3);
  });

  it('drains the full stream when usage never arrives', async () => {
    const content = {
      choices: [{ index: 0, delta: { content: 'hi' }, finish_reason: null }],
    };
    const finish = {
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
    };

    createMock.mockReturnValue(fakeStream([content, finish], () => {}));

    const provider = openai({ apiKey: 'sk-test', model: 'gpt-5' });
    const out: ProviderChunk[] = [];
    for await (const chunk of provider.stream(makeRequest())) {
      out.push(chunk);
    }

    expect(out).toEqual([{ textDelta: 'hi' }, { finishReason: 'stop' }]);
  });
});
