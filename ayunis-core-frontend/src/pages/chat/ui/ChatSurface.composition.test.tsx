import { useState } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  ChatConversation,
  ChatSurface,
  createClientToolRegistry,
  type ChatConversationProps,
  type ChatThreadSnapshot,
} from '@ayunis/chat/surface';
import { MAX_IMAGE_SIZE_BYTES } from '@ayunis/chat/composer';
import type { RunEndpoints, RunMessagePayload } from '@ayunis/chat/runs';
import type { AssistantMessageResponseDto } from '@ayunis/api-client/schemas';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

beforeAll(async () => {
  Element.prototype.scrollIntoView ??= () => undefined;
  await createInstance()
    .use(initReactI18next)
    .init({ lng: 'en', resources: { en: { common: {} } } });
});

const first = { id: 'first', title: 'First chat', messages: [], piiMasks: [] };
const second = {
  id: 'second',
  title: 'Second chat',
  messages: [],
  piiMasks: [],
};

function TestHost(props: Pick<ChatConversationProps, 'config' | 'adapters'>) {
  const [thread, setThread] = useState(first);
  return (
    <ChatConversation
      {...props}
      sessionKey="test-user"
      thread={thread}
      history={{
        chats: [first, second],
        onSelect: (id) => setThread(id === first.id ? first : second),
      }}
    />
  );
}

function event(
  threadId: string,
  id: string,
  content: AssistantMessageResponseDto['content'],
) {
  return {
    type: 'message',
    message: {
      id,
      threadId,
      role: 'assistant' as const,
      createdAt: '2026-11-24T12:00:00Z',
      content,
    },
  };
}

function answer(threadId: string, id: string, text: string) {
  return event(threadId, id, [{ type: 'text', text }]);
}

const encoder = new TextEncoder();
function chunk(value: object) {
  return encoder.encode('data: ' + JSON.stringify(value) + '\n\n');
}

function stream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(value) {
        controller = value;
      },
    }),
  );
  return {
    response,
    push: (value: object) => controller.enqueue(chunk(value)),
    close: () => controller.close(),
  };
}

function send(text: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
}

function deferredToolRun(
  policy: Pick<
    NonNullable<ChatConversationProps['clientTools']>,
    'canDispatch' | 'contextKey' | 'resumeOnOpen'
  > = {},
) {
  const pending = stream();
  const toolCall = event(first.id, 'a1', [
    { type: 'tool_use', id: 'call', name: 'read_context', params: {} },
  ]);
  const request = vi
    .fn<RunEndpoints['send']>()
    .mockResolvedValueOnce(pending.response)
    .mockImplementation(
      async () => new Response(chunk(answer(first.id, 'a2', 'Done'))),
    );
  const execute = vi.fn(async () => 'test result');
  const onRunSettled = vi.fn();
  const props = {
    sessionKey: 'test-user',
    config: { transport: { send: request }, capabilities: {} },
    adapters: { onRunSettled },
    clientTools: {
      registry: createClientToolRegistry<undefined, string>({
        read_context: { execute },
      }),
      invoke: (executor, call) => executor(call, undefined),
      ...policy,
    },
  } satisfies Omit<ChatConversationProps<undefined, string>, 'thread'>;
  const saved: ChatThreadSnapshot = { ...first, messages: [toolCall.message] };
  async function finish() {
    await act(async () => {
      pending.push(toolCall);
      pending.close();
    });
    expect(onRunSettled).toHaveBeenCalledWith(first.id, expect.anything());
  }
  return { props, saved, request, execute, finish };
}

describe('shared chat composition', () => {
  it('preserves per-chat drafts and resumes rendering the first run after switching chats', async () => {
    const pending = stream();
    const request = vi.fn(async () => pending.response);
    render(
      <TestHost config={{ transport: { send: request }, capabilities: {} }} />,
    );
    send('Question');
    expect(request).toHaveBeenCalledWith(
      { threadId: first.id, text: 'Question', streaming: true },
      expect.any(AbortSignal),
    );
    await act(async () =>
      pending.push(answer(first.id, 'a1', 'Partial answer')),
    );
    expect(await screen.findByText('Partial answer')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: second.title }));
    expect(screen.queryByText('Partial answer')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
      target: { value: 'Second draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: first.title }));
    expect(screen.getByText('Partial answer')).toBeTruthy();
    await act(async () => {
      pending.push(answer(first.id, 'a1', 'Final answer'));
      pending.close();
    });
    expect(await screen.findByText('Final answer')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: second.title }));
    expect(screen.getByDisplayValue('Second draft')).toBeTruthy();
  });

  it('keeps the sent text visible until the batched user message reaches the timeline', async () => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    });
    const pending = stream();
    try {
      const request = vi.fn(async () => pending.response);
      render(
        <TestHost
          config={{ transport: { send: request }, capabilities: {} }}
        />,
      );
      send('Visible prompt');
      const echoed = answer(first.id, 'u1', 'Visible prompt');
      await act(async () =>
        pending.push({
          ...echoed,
          message: { ...echoed.message, role: 'user' },
        }),
      );
      expect(screen.getByDisplayValue('Visible prompt')).toBeDefined();
      act(() => vi.advanceTimersToNextFrame());
      expect(screen.getByText('Visible prompt')).toBeDefined();
      expect(screen.queryByDisplayValue('Visible prompt')).toBeNull();
    } finally {
      await act(async () => pending.close());
      vi.useRealTimers();
    }
  });

  it('keeps a new draft on the selected thread when a previous thread is accepted', async () => {
    const pending = stream();
    const request = vi
      .fn<RunEndpoints['send']>()
      .mockResolvedValue(pending.response);
    render(
      <TestHost config={{ transport: { send: request }, capabilities: {} }} />,
    );
    send('First prompt');
    fireEvent.click(screen.getByRole('button', { name: second.title }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
      target: { value: 'Second draft' },
    });
    await act(async () => {
      pending.push(answer(first.id, 'a1', 'First response'));
      pending.close();
    });
    expect(screen.getByDisplayValue('Second draft')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: first.title }));
    expect(screen.queryByDisplayValue('First prompt')).toBeNull();
  });

  it('aborts the old session and opens a fresh draft when the principal changes', async () => {
    const prior = stream();
    const request = vi
      .fn<RunEndpoints['send']>()
      .mockResolvedValueOnce(prior.response)
      .mockResolvedValueOnce(
        new Response(chunk(answer(first.id, 'a2', 'New session response'))),
      );
    const config = { transport: { send: request }, capabilities: {} };
    const onRunSettled = vi.fn();
    const { rerender } = render(
      <ChatConversation
        sessionKey="first-user"
        thread={first}
        config={config}
        adapters={{ onRunSettled }}
      />,
    );
    send('Old session prompt');
    const signal = request.mock.calls[0][1];
    await act(async () => {
      rerender(
        <ChatConversation
          sessionKey="second-user"
          thread={first}
          config={config}
          adapters={{ onRunSettled }}
        />,
      );
    });
    expect(signal.aborted).toBe(true);
    expect(screen.queryByDisplayValue('Old session prompt')).toBeNull();
    await act(async () => {
      prior.push(answer(first.id, 'a1', 'Old session response'));
      prior.close();
    });
    expect(screen.queryByText('Old session response')).toBeNull();
    expect(onRunSettled).not.toHaveBeenCalled();
    send('New session prompt');
    expect(await screen.findByText('New session response')).toBeTruthy();
  });

  it('follows an existing run and stops the selected thread through the transport', async () => {
    const pending = stream();
    const follow = vi.fn(async () => pending.response);
    const cancel = vi.fn(async () => undefined);
    const request = vi.fn(async () => new Response(null, { status: 204 }));
    render(
      <ChatConversation
        sessionKey="test-user"
        thread={first}
        activeRun={{
          run: { cancellable: true },
          dataUpdatedAt: Date.now(),
          isFetching: false,
        }}
        config={{
          transport: { send: request, follow, cancel },
          capabilities: {},
        }}
      />,
    );
    await waitFor(() =>
      expect(follow).toHaveBeenCalledWith(first.id, expect.any(AbortSignal)),
    );
    await act(async () =>
      pending.push(answer(first.id, 'a1', 'Joined answer')),
    );
    expect(await screen.findByText('Joined answer')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(cancel).toHaveBeenCalledWith(first.id);
    expect(follow.mock.calls).toHaveLength(1);
    pending.close();
    expect(request).not.toHaveBeenCalled();
  });

  it('runs a registered client tool and posts its result on the same thread', async () => {
    const toolCall = event(first.id, 'a1', [
      { type: 'tool_use', id: 'call', name: 'read_context', params: {} },
    ]);
    const request = vi.fn(
      async (payload: RunMessagePayload) =>
        new Response(
          chunk(payload.toolResult ? answer(first.id, 'a2', 'Done') : toolCall),
        ),
    );
    const execute = vi.fn(async () => 'test result');
    const registry = createClientToolRegistry({ read_context: { execute } });
    render(
      <ChatConversation
        sessionKey="test-user"
        thread={first}
        config={{ transport: { send: request }, capabilities: {} }}
        clientTools={{
          registry,
          invoke: (executor, call) => executor(call, undefined),
        }}
      />,
    );
    send('Run the tool');
    expect(await screen.findByText('Done')).toBeTruthy();
    expect(execute).toHaveBeenCalledOnce();
    expect(request).toHaveBeenLastCalledWith(
      {
        threadId: first.id,
        streaming: true,
        toolResult: {
          toolId: 'call',
          toolName: 'read_context',
          result: 'test result',
        },
      },
      expect.any(AbortSignal),
    );
  });

  it('continues a snapshot read after following the active run', async () => {
    const { props, saved, execute } = deferredToolRun();
    const follow = vi.fn(
      async () =>
        new Response(chunk(answer(first.id, 'progress', 'Followed output'))),
    );
    const request = vi.fn(
      async () => new Response(chunk(answer(first.id, 'final', 'Done'))),
    );
    render(
      <ChatConversation
        {...props}
        config={{ ...props.config, transport: { follow, send: request } }}
        thread={saved}
        activeRun={{
          run: { cancellable: true },
          dataUpdatedAt: Date.now(),
          isFetching: false,
        }}
      />,
    );

    expect(await screen.findByText('Done')).toBeTruthy();
    expect(follow).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledOnce();
  });

  it('continues an interrupted read on reopen when the host allows replay', async () => {
    const { props, saved, request, execute, finish } = deferredToolRun({
      resumeOnOpen: () => true,
    });
    let finishFirstRead: ((result: string) => void) | undefined;
    execute.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFirstRead = resolve;
        }),
    );
    const { rerender } = render(<ChatConversation {...props} thread={first} />);
    send('Read this context');
    await finish();
    await waitFor(() => expect(execute).toHaveBeenCalledOnce());

    rerender(<ChatConversation {...props} thread={second} />);
    await act(async () => finishFirstRead?.('read from the old view'));
    expect(request).toHaveBeenCalledTimes(1);
    rerender(<ChatConversation {...props} thread={saved} />);

    expect(await screen.findByText('Done')).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.at(-1)?.[0].toolResult?.result).toBe(
      'test result',
    );
  });

  it.each([204, 200])(
    'posts the deferred tool result after a stale follow returns %i',
    async (status) => {
      const { props, saved, request, execute, finish } = deferredToolRun();
      const { rerender } = render(
        <ChatConversation {...props} thread={first} />,
      );
      send('Read the original context');
      rerender(<ChatConversation {...props} thread={second} />);
      await finish();
      expect(execute).not.toHaveBeenCalled();
      expect(request).toHaveBeenCalledTimes(1);

      const olderCall = event(first.id, 'older', [
        { type: 'tool_use', id: 'old-call', name: 'read_context', params: {} },
      ]);
      const stale = { ...first, messages: [olderCall.message] };
      const follow = vi.fn(
        async () =>
          new Response(status === 204 ? null : chunk(olderCall), { status }),
      );
      rerender(
        <ChatConversation
          {...props}
          config={{ ...props.config, transport: { send: request, follow } }}
          thread={stale}
          activeRun={{
            run: { cancellable: true },
            dataUpdatedAt: Date.now(),
            isFetching: false,
          }}
        />,
      );
      await waitFor(() =>
        expect(props.adapters.onRunSettled).toHaveBeenCalledTimes(2),
      );
      expect(follow).toHaveBeenCalledWith(first.id, expect.any(AbortSignal));
      expect(execute).not.toHaveBeenCalled();
      rerender(<ChatConversation {...props} thread={saved} />);
      expect(await screen.findByText('Done')).toBeTruthy();
      expect(execute).toHaveBeenCalledOnce();
      expect(request).toHaveBeenLastCalledWith(
        {
          threadId: first.id,
          streaming: true,
          toolResult: {
            toolId: 'call',
            toolName: 'read_context',
            result: 'test result',
          },
        },
        expect.any(AbortSignal),
      );
      rerender(<ChatConversation {...props} thread={second} />);
      rerender(<ChatConversation {...props} thread={saved} />);
      expect(request).toHaveBeenCalledTimes(2);
    },
  );

  it('waits for permission on an unanswered read from a reopened snapshot', async () => {
    const canDispatch = vi.fn(() => false);
    const { props, saved, execute } = deferredToolRun({
      canDispatch,
      resumeOnOpen: () => true,
    });
    const request = vi.fn(
      async () => new Response(chunk(answer(first.id, 'a2', 'Done'))),
    );
    const config = { ...props.config, transport: { send: request } };
    const { rerender } = render(
      <ChatConversation {...props} config={config} thread={second} />,
    );

    rerender(<ChatConversation {...props} config={config} thread={saved} />);
    expect(canDispatch).toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();

    canDispatch.mockReturnValue(true);
    rerender(<ChatConversation {...props} config={config} thread={saved} />);
    expect(await screen.findByText('Done')).toBeTruthy();
    expect(request).toHaveBeenCalledOnce();
  });

  it('keeps deferred results queued until the selected host can dispatch', async () => {
    const canDispatch = vi.fn(() => false);
    const { props, saved, request, execute, finish } = deferredToolRun({
      canDispatch,
    });
    const { rerender } = render(<ChatConversation {...props} thread={first} />);
    send('Read the original context');
    rerender(<ChatConversation {...props} thread={second} />);
    await finish();
    rerender(<ChatConversation {...props} thread={saved} />);
    expect(canDispatch).toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);

    canDispatch.mockReturnValue(true);
    rerender(<ChatConversation {...props} thread={saved} />);
    expect(await screen.findByText('Done')).toBeTruthy();
    expect(execute).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('posts a deferred result when its context matches again without reopening the thread', async () => {
    const { props, saved, request, execute, finish } = deferredToolRun({
      contextKey: 'original',
    });
    const { rerender } = render(<ChatConversation {...props} thread={first} />);
    send('Read the original context');
    rerender(<ChatConversation {...props} thread={second} />);
    await finish();

    rerender(
      <ChatConversation
        {...props}
        thread={saved}
        clientTools={{ ...props.clientTools, contextKey: 'different' }}
      />,
    );
    expect(execute).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);

    rerender(<ChatConversation {...props} thread={saved} />);
    expect(await screen.findByText('Done')).toBeTruthy();
    expect(execute).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('queues tool results when the selected context changes before the run finishes', async () => {
    const { props, request, execute, finish } = deferredToolRun({
      contextKey: 'original',
    });
    const { rerender } = render(<ChatConversation {...props} thread={first} />);
    send('Read the original context');
    rerender(
      <ChatConversation
        {...props}
        thread={first}
        clientTools={{ ...props.clientTools, contextKey: 'different' }}
      />,
    );

    await finish();
    expect(execute).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);

    rerender(<ChatConversation {...props} thread={first} />);
    expect(await screen.findByText('Done')).toBeTruthy();
    expect(execute).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['the host declines to resume', 'test-user', 'original', false],
    ['the host context changed', 'test-user', 'different', true],
    ['the principal changed', 'another-user', 'original', undefined],
  ] as const)(
    'leaves the deferred result alone when %s',
    async (_reason, sessionKey, contextKey, resume) => {
      const { props, saved, request, execute, finish } = deferredToolRun({
        contextKey: 'original',
      });
      const { rerender } = render(
        <ChatConversation {...props} thread={first} />,
      );
      send('Read the original context');
      rerender(<ChatConversation {...props} thread={second} />);
      await finish();

      await act(async () => {
        rerender(
          <ChatConversation
            {...props}
            sessionKey={sessionKey}
            thread={saved}
            clientTools={{
              ...props.clientTools,
              contextKey,
              resumeOnOpen: resume === undefined ? undefined : () => resume,
            }}
          />,
        );
      });
      expect(execute).not.toHaveBeenCalled();
      expect(request).toHaveBeenCalledTimes(1);
    },
  );

  it('reports a failed dictation once', async () => {
    class TestRecorder {
      static readonly isTypeSupported = () => true;
      state = 'inactive';
      ondataavailable?: (event: { data: Blob }) => void;
      onstop?: () => void;

      start() {
        this.state = 'recording';
      }

      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({
          data: new Blob([new Uint8Array(4096)], { type: 'audio/webm' }),
        });
        this.onstop?.();
      }
    }
    vi.stubGlobal('MediaRecorder', TestRecorder);
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
      },
    });
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const onError = vi.fn();
      const transcribe = vi.fn().mockRejectedValue(new Error('Offline'));
      const send = vi.fn(async () => new Response(null, { status: 204 }));
      render(
        <TestHost
          config={{ transport: { send }, capabilities: { voice: true } }}
          adapters={{ onError, transcribe }}
        />,
      );
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Dictate' }));
      });
      vi.setSystemTime(Date.now() + 2000);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }));
      });

      expect(transcribe).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('keeps an accepted photo and explains why the larger one was rejected', () => {
    const onError = vi.fn();
    const send = vi.fn(async () => new Response(null, { status: 204 }));
    const valid = new File(['fixture'], 'small.png', { type: 'image/png' });
    const oversized = new File(['fixture'], 'large.png', { type: 'image/png' });
    Object.defineProperty(oversized, 'size', {
      value: MAX_IMAGE_SIZE_BYTES + 1,
    });
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override readonly createObjectURL = () => 'blob:fixture';
        static override readonly revokeObjectURL = () => undefined;
      },
    );
    vi.stubGlobal('crypto', { randomUUID: undefined });
    const { unmount } = render(
      <TestHost
        config={{ transport: { send }, capabilities: { fileUpload: true } }}
        adapters={{ imageAttachments: true, onError }}
      />,
    );
    try {
      fireEvent.change(screen.getByLabelText('Attach images'), {
        target: { files: [valid, oversized] },
      });

      expect(screen.getByRole('img', { name: 'small.png' })).toBeDefined();
      expect(screen.queryByRole('img', { name: 'large.png' })).toBeNull();
      expect(onError).toHaveBeenCalledExactlyOnceWith(
        new Error('chatInput.imageTooLarge'),
      );
    } finally {
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it('suppresses disabled actions and routes enabled actions to the host adapters', async () => {
    const selectModel = vi.fn(async () => undefined);
    const uploadFiles = vi.fn(async () => undefined);
    const transcribe = vi.fn(async () => null);
    const rename = vi.fn(async () => undefined);
    const remove = vi.fn(async () => undefined);
    const request = vi.fn(async () => new Response(null, { status: 204 }));
    const props = {
      sessionKey: 'test-user',
      thread: first,
      adapters: {
        model: {
          selected: 'a',
          available: [
            { id: 'a', name: 'Model A' },
            { id: 'b', name: 'Model B' },
          ],
          select: selectModel,
        },
        uploadFiles,
        transcribe,
      },
      history: { chats: [first], onSelect: vi.fn(), rename, remove },
    };
    const transport = { send: request };
    const { rerender } = render(
      <ChatConversation {...props} config={{ transport, capabilities: {} }} />,
    );
    expect(screen.queryByLabelText('Attach files')).toBeNull();
    expect(screen.queryByLabelText('Model')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Rename First chat' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Delete First chat' }),
    ).toBeNull();
    expect(selectModel).not.toHaveBeenCalled();
    expect(uploadFiles).not.toHaveBeenCalled();
    expect(transcribe).not.toHaveBeenCalled();
    expect(rename).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();

    rerender(
      <ChatConversation
        {...props}
        config={{
          transport,
          capabilities: {
            fileUpload: true,
            modelSelection: true,
            rename: true,
            delete: true,
          },
        }}
      />,
    );
    const file = new File(['fixture'], 'fixture.txt', { type: 'text/plain' });
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Attach files'), {
        target: { files: [file] },
      });
    });
    expect(uploadFiles).toHaveBeenCalledWith(
      first.id,
      [file],
      expect.any(AbortSignal),
    );
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Model' }), {
      key: 'Enter',
    });
    await act(async () => {
      fireEvent.click(await screen.findByRole('option', { name: 'Model B' }));
    });
    expect(selectModel).toHaveBeenCalledWith(
      first.id,
      'b',
      expect.any(AbortSignal),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rename First chat' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Chat title' }), {
      target: { value: 'New title' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save title' }));
    await waitFor(() =>
      expect(rename).toHaveBeenCalledWith(
        first.id,
        'New title',
        expect.any(AbortSignal),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete First chat' }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete chat' }));
    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith(first.id, expect.any(AbortSignal)),
    );
  });
});

it('leaves the viewport unobstructed when a conditional header renders nothing', () => {
  const { container } = render(
    <ChatSurface
      slots={{ header: () => false }}
      renderContent={() => <p>Conversation</p>}
      composer={<p>Composer</p>}
    />,
  );
  expect(container.querySelector('.content-scroll-header')).toBeNull();
  expect(container.querySelector('.content-scroll-header-offset')).toBeNull();
});
