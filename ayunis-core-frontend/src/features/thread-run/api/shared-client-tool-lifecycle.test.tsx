import { useState, useSyncExternalStore } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import { createClientToolRegistry } from '@ayunis/chat/surface';
import {
  createChatRunLifecycle,
  useChatRunLifecycle,
  useClientToolLifecycle,
  type RunEndpoints,
} from '@ayunis/chat/runs';

type Message = GetThreadResponseDto['messages'][number];
const threadId = 'thread';
const read = { type: 'tool_use', id: 'read', name: 'read_note', params: {} };
const approval = {
  type: 'tool_use',
  id: 'approval',
  name: 'external',
  params: {},
  requiresConfirmation: true,
};

function stream(...contents: object[]): Response {
  const messages = contents.map((content, index) =>
    JSON.stringify({
      type: 'message',
      message: {
        id: String(index),
        threadId,
        createdAt: '2026-01-01T00:00:00.000Z',
        ...content,
      },
    }),
  );
  return new Response(messages.map((message) => `data: ${message}\n`).join(''));
}

function toolTurn(...content: object[]) {
  return { role: 'assistant', content };
}

function answered(toolId: string) {
  return {
    role: 'tool',
    content: [{ type: 'tool_result', toolId, result: 'settled' }],
  };
}

function setup(
  execute: (signal: AbortSignal) => Promise<string | undefined>,
  resumeOnOpen = false,
) {
  const send = vi.fn<RunEndpoints['send']>();
  const follow = vi.fn<NonNullable<RunEndpoints['follow']>>();
  const runtime = createChatRunLifecycle({ send, follow });
  const registry = createClientToolRegistry({
    read_note: { execute: (_call, signal: AbortSignal) => execute(signal) },
  });
  const hook = renderHook(
    ({ contextKey }: { contextKey: string }) => {
      const [messages, setMessages] = useState<Message[]>([]);
      const isStreaming = useSyncExternalStore(
        runtime.subscribeToActiveThreadRuns,
        () => runtime.isThreadRunActive(threadId),
      );
      const run = useChatRunLifecycle(runtime, {
        threadId,
        onMessageEvent: ({ message }) =>
          setMessages((previous) => [
            ...previous.filter(({ id }) => id !== message.id),
            message,
          ]),
        onComplete: (failed, reason) => tools.runEnded(failed, reason),
      });
      const tools = useClientToolLifecycle(runtime, {
        threadId,
        messages,
        isStreaming,
        isCheckingForRun: false,
        dispatch: {
          registry,
          contextKey,
          resumeOnOpen: () => resumeOnOpen,
          invoke: (invoke, call, signal) => invoke(call, signal),
        },
        sendToolResult: run.sendToolResult,
      });
      return { ...run, beginRun: tools.beginRun };
    },
    { initialProps: { contextKey: 'note-a' }, reactStrictMode: true },
  );
  return { ...hook, runtime, send, follow };
}

describe('shared client tool lifecycle', () => {
  it('posts one registered result and does not execute again when following the completed turn', async () => {
    const execute = vi.fn(async () => 'a note');
    const chat = setup(execute);
    chat.send
      .mockResolvedValueOnce(stream(toolTurn(read)))
      .mockResolvedValueOnce(stream(toolTurn(read), answered('read')));
    chat.follow.mockResolvedValueOnce(stream(toolTurn(read), answered('read')));

    await act(async () => {
      chat.result.current.beginRun();
      await chat.result.current.sendTextMessage({ text: 'read a note' });
    });
    await waitFor(() => expect(chat.send).toHaveBeenCalledTimes(2));
    expect(chat.send).toHaveBeenLastCalledWith(
      {
        threadId,
        toolResult: { toolId: 'read', toolName: 'read_note', result: 'a note' },
        streaming: true,
      },
      expect.any(AbortSignal),
    );

    await act(() => chat.result.current.attach());
    expect(execute).toHaveBeenCalledOnce();
    expect(chat.send).toHaveBeenCalledTimes(2);
  });

  it('keeps one executor active when a rejoin repeats the unanswered call', async () => {
    let finish: ((value: string) => void) | undefined;
    const execute = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const chat = setup(execute);
    chat.send
      .mockResolvedValueOnce(stream(toolTurn(read)))
      .mockResolvedValueOnce(stream(toolTurn(read), answered('read')));
    chat.follow.mockResolvedValueOnce(stream(toolTurn(read)));

    await act(async () => {
      chat.result.current.beginRun();
      await chat.result.current.sendTextMessage({ text: 'read a note' });
    });
    await act(() => chat.result.current.attach());
    expect(execute).toHaveBeenCalledOnce();

    await act(async () => finish?.('original note'));
    expect(chat.send).toHaveBeenCalledTimes(2);
  });

  it('holds the client tool while its turn awaits confirmation', async () => {
    const execute = vi.fn(async () => 'a note');
    const chat = setup(execute);
    chat.send
      .mockResolvedValueOnce(stream(toolTurn(read, approval)))
      .mockResolvedValueOnce(
        stream(toolTurn(read, approval), answered('approval')),
      )
      .mockResolvedValueOnce(
        stream(
          toolTurn(read, approval),
          answered('approval'),
          answered('read'),
        ),
      );

    await act(async () => {
      chat.result.current.beginRun();
      await chat.result.current.sendTextMessage({
        text: 'read after confirmation',
      });
    });
    expect(execute).not.toHaveBeenCalled();

    const decisions = [
      { toolCallId: 'approval', approved: true, alwaysAllow: false },
    ];
    await act(() => chat.result.current.sendToolCallDecisions(decisions));
    expect(chat.send).toHaveBeenNthCalledWith(
      2,
      { threadId, decisions, streaming: true },
      expect.any(AbortSignal),
    );
    await waitFor(() => expect(chat.send).toHaveBeenCalledTimes(3));
    expect(execute).toHaveBeenCalledOnce();
  });

  it('executes a new turn after a session reset on the same mounted view', async () => {
    const execute = vi.fn(async () => 'a note');
    const chat = setup(execute, true);
    const nextRead = { ...read, id: 'fresh-read' };
    chat.send
      .mockResolvedValueOnce(stream(toolTurn(read)))
      .mockResolvedValueOnce(stream(toolTurn(read), answered('read')))
      .mockResolvedValueOnce(stream(toolTurn(nextRead)))
      .mockResolvedValueOnce(
        stream(toolTurn(nextRead), answered('fresh-read')),
      );

    await act(async () => {
      chat.result.current.beginRun();
      await chat.result.current.sendTextMessage({ text: 'first note' });
    });
    await waitFor(() => expect(chat.send).toHaveBeenCalledTimes(2));
    act(() => chat.runtime.reset());
    expect(execute).toHaveBeenCalledOnce();

    await act(async () => {
      chat.result.current.beginRun();
      await chat.result.current.sendTextMessage({ text: 'fresh note' });
    });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(chat.send).toHaveBeenCalledTimes(4);
  });

  it.each(['scope change', 'session reset', 'new turn'])(
    'drops an in-flight result after %s',
    async (boundary) => {
      let finish: ((result: string) => void) | undefined;
      const execute = vi.fn(
        (_signal: AbortSignal) =>
          new Promise<string>((resolve) => {
            finish = resolve;
          }),
      );
      const chat = setup(execute, true);
      chat.send.mockResolvedValueOnce(stream(toolTurn(read)));
      await act(async () => {
        chat.result.current.beginRun();
        await chat.result.current.sendTextMessage({ text: 'read a note' });
      });
      expect(execute).toHaveBeenCalledOnce();

      if (boundary === 'scope change') chat.rerender({ contextKey: 'note-b' });
      else if (boundary === 'session reset') {
        act(() => chat.runtime.reset());
        chat.rerender({ contextKey: 'note-a' });
      } else act(() => chat.result.current.beginRun());

      await act(async () => finish?.('old note'));
      expect(execute).toHaveBeenCalledOnce();
      expect(execute.mock.calls[0]?.[0].aborted).toBe(true);
      expect(chat.send).toHaveBeenCalledOnce();
    },
  );
});
