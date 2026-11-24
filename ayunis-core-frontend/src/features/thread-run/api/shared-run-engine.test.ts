import { describe, expect, it, vi } from 'vitest';
import { createAuthenticatedRunEndpoints, executeRun } from '@ayunis/chat/runs';

describe('shared run engine', () => {
  it('starts the request through the caller endpoint and delivers a final UTF-8 event without a newline', async () => {
    const body = new TextEncoder().encode(
      'data: {"type":"error","message":"Überlastet"}',
    );
    const boundary = body.indexOf(0xc3) + 1;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(body.slice(0, boundary));
        controller.enqueue(body.slice(boundary));
        controller.close();
      },
    });
    const send = vi.fn(() => Promise.resolve(new Response(stream)));
    const onEvent = vi.fn();
    const onComplete = vi.fn();
    await executeRun(
      { send },
      { threadId: 'thread', text: 'hello' },
      {
        onEvent,
        onUnauthorized: vi.fn(),
        onError: vi.fn(),
        onCleanup: vi.fn(),
        onAbort: vi.fn(),
        onComplete,
      },
    );

    expect(send).toHaveBeenCalledWith(
      { threadId: 'thread', text: 'hello' },
      expect.any(AbortSignal),
    );
    expect(onEvent).toHaveBeenCalledWith({
      type: 'error',
      message: 'Überlastet',
    });
    expect(onComplete).toHaveBeenCalledWith({
      failed: true,
      unauthorized: false,
      reattachFailed: false,
    });
  });

  it('preserves empty text and omits absent multipart data through the configured transport', async () => {
    const fetch = vi.fn((_path: string, _init?: RequestInit) =>
      Promise.resolve(new Response()),
    );
    const endpoints = createAuthenticatedRunEndpoints(fetch, vi.fn());
    const controller = new AbortController();
    await endpoints.send(
      { threadId: 'thread', text: '', streaming: true },
      controller.signal,
    );

    const [path, init] = fetch.mock.calls[0];
    expect(path).toBe('/runs/send-message');
    expect(init?.signal).toBe(controller.signal);
    expect([...(init?.body as FormData).entries()]).toEqual([
      ['threadId', 'thread'],
      ['text', ''],
      ['streaming', 'true'],
    ]);
  });
});
