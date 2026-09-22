import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_NUM_CTX,
  DEFAULT_NUM_PREDICT,
  ollama,
} from './ollama-provider';

const ollamaCtor = vi.hoisted(() => vi.fn());

vi.mock('ollama', () => ({ Ollama: ollamaCtor }));

beforeEach(() => {
  ollamaCtor.mockClear();
});

describe('request limits', () => {
  it('enforces the default context and output-token limits', async () => {
    const chat = vi.fn().mockResolvedValue({
      abort: vi.fn(),
      async *[Symbol.asyncIterator]() {},
    });
    ollamaCtor.mockImplementation(function () {
      return { chat };
    });
    const provider = ollama({
      baseUrl: 'http://localhost:11434',
      model: 'gpt-oss:120b',
    });

    await provider
      .stream({ instructions: '', messages: [], tools: [] })
      [Symbol.asyncIterator]()
      .next();

    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          num_ctx: DEFAULT_NUM_CTX,
          num_predict: DEFAULT_NUM_PREDICT,
        },
      }),
    );
  });
});
