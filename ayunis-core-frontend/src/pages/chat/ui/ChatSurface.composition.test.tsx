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
} from '@ayunis/chat/surface';
import type { RunEndpoints, RunMessagePayload } from '@ayunis/chat/runs';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

beforeAll(async () => {
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

function event(threadId: string, id: string, content: object[]) {
  return {
    type: 'message',
    message: {
      id,
      threadId,
      role: 'assistant',
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
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Model'), {
        target: { value: 'b' },
      });
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
