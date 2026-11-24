import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createChatRunLifecycle,
  useChatRunLifecycle,
  useThreadRunReattach,
  type RunEndpoints,
} from '@ayunis/chat/runs';

function controlledStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(value) {
        controller = value;
      },
    }),
  );
  const encoder = new TextEncoder();
  return {
    response,
    emit(event: object) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n`));
    },
    finish() {
      controller.close();
    },
  };
}

describe('package run lifecycle', () => {
  it('keeps streams and subscribers isolated between runtimes with the same thread id', async () => {
    const first = controlledStream();
    const second = controlledStream();
    const web = createChatRunLifecycle({
      send: () => Promise.resolve(first.response),
    });
    const otherSession = createChatRunLifecycle({
      send: () => Promise.resolve(second.response),
    });
    const receiveFirst = vi.fn();
    const receiveSecond = vi.fn();
    web.subscribe('thread', receiveFirst);
    otherSession.subscribe('thread', receiveSecond);

    const firstRun = web.run({ threadId: 'thread', text: 'First session' });
    const secondRun = otherSession.run({
      threadId: 'thread',
      text: 'Second session',
    });
    first.emit({ type: 'message', message: { id: 'first-answer' } });
    second.emit({ type: 'message', message: { id: 'second-answer' } });
    first.finish();
    second.finish();
    await Promise.all([firstRun, secondRun]);

    expect(receiveFirst.mock.calls).toEqual([
      [
        {
          type: 'message',
          message: { id: 'first-answer' },
        },
      ],
    ]);
    expect(receiveSecond.mock.calls).toEqual([
      [
        {
          type: 'message',
          message: { id: 'second-answer' },
        },
      ],
    ]);
  });

  it('clears buffered events and ignores late callbacks when a session ends', async () => {
    const stream = controlledStream();
    const ended = vi.fn();
    const observed = vi.fn();
    const runtime = createChatRunLifecycle({
      send: () => Promise.resolve(stream.response),
    });
    const run = runtime.run(
      { threadId: 'thread', text: 'Prior session' },
      {
        onComplete: ended,
        onEvent: observed,
      },
    );
    stream.emit({ type: 'masks', masks: [{ id: 'old-mask' }] });
    await vi.waitFor(() => expect(observed).toHaveBeenCalledOnce());
    runtime.reset();

    const newSession = vi.fn();
    runtime.subscribe('thread', newSession);
    stream.emit({ type: 'message', message: { id: 'late-response' } });
    stream.finish();
    await run;
    expect(newSession).not.toHaveBeenCalled();
    expect(ended).not.toHaveBeenCalled();
  });

  it('replays only the latest snapshots to a returning thread and in mask-first order', async () => {
    const stream = controlledStream();
    const seen = vi.fn();
    const runtime = createChatRunLifecycle({
      send: async () => stream.response,
    });
    const otherThread = vi.fn();
    runtime.subscribe('other', otherThread);
    const run = runtime.run(
      { threadId: 'thread', text: 'Prompt' },
      { onEvent: seen },
    );

    stream.emit({ type: 'message', message: { id: 'reply', revision: 1 } });
    stream.emit({ type: 'message', message: { id: 'reply', revision: 2 } });
    stream.emit({ type: 'masks', masks: [{ id: 'mask' }] });
    await vi.waitFor(() => expect(seen).toHaveBeenCalledTimes(3));

    const returning = vi.fn();
    runtime.subscribe('thread', returning);
    expect(returning.mock.calls).toEqual([
      [{ type: 'masks', masks: [{ id: 'mask' }] }],
      [{ type: 'message', message: { id: 'reply', revision: 2 } }],
    ]);
    expect(otherThread).not.toHaveBeenCalled();
    stream.finish();
    await run;
  });

  it('preserves a newer stop when the previous session’s cancel request fails', async () => {
    const report = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      let rejectFirstCancel!: (error: Error) => void;
      const firstCancel = new Promise<void>((_, reject) => {
        rejectFirstCancel = reject;
      });
      const cancel = vi
        .fn<NonNullable<RunEndpoints['cancel']>>()
        .mockReturnValueOnce(firstCancel)
        .mockResolvedValueOnce(undefined);
      const runtime = createChatRunLifecycle({
        send: async () => new Response(null, { status: 204 }),
        cancel,
      });

      runtime.stopThreadRun('thread');
      runtime.reset();
      runtime.stopThreadRun('thread');
      rejectFirstCancel(new Error('Old session ended'));
      await vi.waitFor(() => expect(report).toHaveBeenCalled());

      expect(runtime.isThreadRunStopped('thread')).toBe(true);
    } finally {
      report.mockRestore();
    }
  });
});

describe('a host using the public chat package hooks', () => {
  const threadId = 'thread';

  it('consumes the first request once and sends continuations through the injected transport', async () => {
    const stream = controlledStream();
    const send = vi
      .fn<RunEndpoints['send']>()
      .mockResolvedValueOnce(stream.response)
      .mockImplementation(async () => new Response(null, { status: 204 }));
    const runtime = createChatRunLifecycle({ send });
    runtime.startThreadRun({ threadId, text: 'First prompt', images: [] });
    const first = runtime.takeStartedThreadRun(threadId);
    expect(first).not.toBeNull();
    expect(runtime.takeStartedThreadRun(threadId)).toBeNull();
    const onMessageEvent = vi.fn();
    const { result } = renderHook(() =>
      useChatRunLifecycle(runtime, { threadId, onMessageEvent }),
    );

    stream.emit({ type: 'message', message: { id: 'answer' } });
    stream.finish();
    const toolResult = {
      toolId: 'call',
      toolName: 'read',
      result: 'Read result',
    };
    const decisions = [
      { toolCallId: 'approval', approved: true, alwaysAllow: true },
    ];
    await act(async () => {
      await result.current.sendTextMessage({
        text: 'First prompt',
        startedRequest: first?.request,
      });
      expect(send).toHaveBeenCalledOnce();
      await result.current.sendToolResult(toolResult);
      await result.current.sendToolCallDecisions(decisions);
    });

    expect(onMessageEvent).toHaveBeenCalledWith({
      type: 'message',
      message: { id: 'answer' },
    });
    expect(send).toHaveBeenNthCalledWith(
      2,
      { threadId, toolResult, streaming: true },
      expect.any(AbortSignal),
    );
    expect(send).toHaveBeenNthCalledWith(
      3,
      { threadId, decisions, streaming: true },
      expect.any(AbortSignal),
    );
  });

  it('rejoins a listed run and stops it without following a stale listing', async () => {
    const stream = controlledStream();
    const follow = vi
      .fn<NonNullable<RunEndpoints['follow']>>()
      .mockResolvedValue(stream.response);
    const cancel = vi
      .fn<NonNullable<RunEndpoints['cancel']>>()
      .mockResolvedValue(undefined);
    const runtime = createChatRunLifecycle({
      send: async () => new Response(null, { status: 204 }),
      follow,
      cancel,
    });
    const snapshot = {
      run: { cancellable: true },
      dataUpdatedAt: 1,
      isFetching: false,
    };
    const onMessageEvent = vi.fn();
    const { result, rerender } = renderHook(
      ({ runSnapshot }) => {
        const run = useChatRunLifecycle(runtime, { threadId, onMessageEvent });
        useThreadRunReattach(
          runtime,
          { threadId, isStreaming: false, attach: run.attach },
          runSnapshot,
        );
        return run;
      },
      { initialProps: { runSnapshot: snapshot } },
    );

    stream.emit({ type: 'message', message: { id: 'existing-answer' } });
    await vi.waitFor(() => expect(onMessageEvent).toHaveBeenCalledOnce());
    expect(follow).toHaveBeenCalledWith(threadId, expect.any(AbortSignal));

    await act(async () => {
      result.current.abort();
      stream.finish();
    });
    rerender({ runSnapshot: { ...snapshot, dataUpdatedAt: 2 } });
    expect(cancel).toHaveBeenCalledWith(threadId);
    expect(follow.mock.calls[0]?.[1].aborted).toBe(true);
    expect(follow).toHaveBeenCalledOnce();
  });
  it('waits for a fresh run listing after the session resets', () => {
    const runtime = createChatRunLifecycle({
      send: async () => new Response(null, { status: 204 }),
    });
    const attach = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const beforeReset = Date.now() - 1000;
    runtime.markThreadRunStopped(threadId);
    const { rerender } = renderHook(
      ({ updatedAt, isStreaming }) =>
        useThreadRunReattach(
          runtime,
          { threadId, isStreaming, attach },
          {
            run: { cancellable: true },
            dataUpdatedAt: updatedAt,
            isFetching: false,
          },
        ),
      { initialProps: { updatedAt: beforeReset, isStreaming: false } },
    );
    expect(attach).not.toHaveBeenCalled();

    act(() => runtime.reset());
    rerender({ updatedAt: beforeReset, isStreaming: false });
    expect(attach).not.toHaveBeenCalled();

    rerender({ updatedAt: Date.now() + 1, isStreaming: false });
    expect(attach).toHaveBeenCalledOnce();
  });
});
