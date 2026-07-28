import { describe, expect, it, beforeEach, vi } from 'vitest';

import { DEFAULT_TIMEOUT_MS, mistral } from './mistral-provider';

const mistralCtor = vi.hoisted(() => vi.fn());

vi.mock('@mistralai/mistralai', () => ({ Mistral: mistralCtor }));

beforeEach(() => {
  mistralCtor.mockClear();
});

describe('mistral client construction', () => {
  it('bounds the whole request with the default timeout', () => {
    mistral({ apiKey: 'mistral-key', model: 'mistral-large-latest' });

    expect(mistralCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: DEFAULT_TIMEOUT_MS }),
    );
  });

  it('lets the host override the timeout', () => {
    mistral({
      apiKey: 'mistral-key',
      model: 'mistral-large-latest',
      timeoutMs: 60_000,
    });

    expect(mistralCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 60_000 }),
    );
  });
});

describe('request deadline', () => {
  const streamOptions = async (
    request: Partial<Parameters<ReturnType<typeof mistral>['stream']>[0]>,
  ) => {
    const stream = vi.fn().mockResolvedValue([]);
    // A regular function, not an arrow: the SDK client is built with `new`.
    mistralCtor.mockImplementation(function () {
      return { chat: { stream } };
    });

    const provider = mistral({
      apiKey: 'mistral-key',
      model: 'mistral-large-latest',
      timeoutMs: 60_000,
    });
    // The generator body only runs once iteration starts.
    await provider
      .stream({ instructions: '', messages: [], tools: [], ...request })
      [Symbol.asyncIterator]()
      .next();

    return stream.mock.calls[0][1] as { signal: AbortSignal };
  };

  it('arms the deadline even when the host supplies no signal', async () => {
    const { signal } = await streamOptions({});

    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
  });

  // The SDK drops its own timeout as soon as a signal is passed, so without
  // composing them a cancellable request would have no deadline at all.
  it('keeps the deadline when the host supplies a signal', async () => {
    const hostController = new AbortController();
    const { signal } = await streamOptions({ signal: hostController.signal });

    expect(signal).not.toBe(hostController.signal);
    expect(signal.aborted).toBe(false);
  });

  it('still aborts when the host cancels', async () => {
    const hostController = new AbortController();
    const { signal } = await streamOptions({ signal: hostController.signal });

    hostController.abort();

    expect(signal.aborted).toBe(true);
  });
});
