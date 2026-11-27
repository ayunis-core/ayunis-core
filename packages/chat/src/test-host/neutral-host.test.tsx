import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import {
  Conversation,
  createClientToolRegistry,
  History,
  NewChat,
  NewChatComposer,
  type ChatConfig,
} from '@ayunis/chat/surface';
import {
  createChatRunLifecycle,
  type ChatRunLifecycle,
  type RunEndpoints,
  type RunMessagePayload,
} from '@ayunis/chat/runs';
import { serveChatBackend, storedChat } from './serve-api';

/*
 * A neutral host: it knows no surface and renders the package screens from a
 * `ChatConfig` alone, switching between them as a host frame would.
 */

vi.mock('@ayunis/ui/lib/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

type View =
  | { readonly kind: 'new' }
  | { readonly kind: 'thread'; readonly threadId: string }
  | { readonly kind: 'history' };

function NeutralHost({
  config,
  lifecycle,
  initial,
}: Readonly<{
  config: ChatConfig;
  lifecycle: ChatRunLifecycle;
  initial: View;
}>) {
  const [view, setView] = useState<View>(initial);
  const open = (threadId: string) => setView({ kind: 'thread', threadId });
  const hostConfig: ChatConfig = {
    ...config,
    events: {
      ...config.events,
      onNewChat: () => setView({ kind: 'new' }),
      onThreadStarted: ({ thread }) => open(thread.id),
      onThreadDeleted: () => setView({ kind: 'history' }),
    },
  };
  return (
    <>
      <nav>
        <button type="button" onClick={() => setView({ kind: 'history' })}>
          Host history
        </button>
        <button type="button" onClick={() => open('first')}>
          Host first
        </button>
        <button type="button" onClick={() => open('second')}>
          Host second
        </button>
      </nav>
      {view.kind === 'new' && (
        <NewChat
          config={hostConfig}
          content={{ greeting: { title: 'Hello' }, starterPrompts: [] }}
          lifecycle={lifecycle}
        />
      )}
      {view.kind === 'thread' && (
        <Conversation
          config={hostConfig}
          threadId={view.threadId}
          lifecycle={lifecycle}
        />
      )}
      {view.kind === 'history' && (
        <History config={hostConfig} lifecycle={lifecycle} onSelect={open} />
      )}
    </>
  );
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

function answer(
  threadId: string,
  id: string,
  content: readonly Record<string, unknown>[],
) {
  return {
    type: 'message',
    message: {
      id,
      threadId,
      role: 'assistant',
      createdAt: '2026-11-27T12:00:00Z',
      content,
    },
  };
}

/** Lets the screens take what the stream delivered. */
async function emit(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

const text = (threadId: string, id: string, value: string) =>
  answer(threadId, id, [{ type: 'text', text: value }]);

function renderHost(
  transport: RunEndpoints,
  initial: View,
  config: Partial<ChatConfig> = {},
) {
  const lifecycle = createChatRunLifecycle(transport);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const chatConfig: ChatConfig = {
    sessionKey: 'user-1',
    transport,
    layout: 'narrow',
    events: { onNewChat: vi.fn() },
    ...config,
  };
  return render(
    <NeutralHost config={chatConfig} lifecycle={lifecycle} initial={initial} />,
    { wrapper },
  );
}

async function openThreadMenu() {
  await waitFor(() =>
    expect(
      document.querySelector('.content-scroll-header [aria-haspopup="menu"]'),
    ).not.toBeNull(),
  );
  const trigger = document.querySelector<HTMLButtonElement>(
    '.content-scroll-header button[aria-haspopup="menu"]',
  ) as HTMLButtonElement;
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  return screen.findAllByRole('menuitem');
}

async function send(message: string) {
  fireEvent.change(await screen.findByTestId('input'), {
    target: { value: message },
  });
  const button = await screen.findByTestId<HTMLButtonElement>('send');
  await waitFor(() => expect(button.disabled).toBe(false));
  fireEvent.click(button);
}

let backend: ReturnType<typeof serveChatBackend>;

beforeAll(async () => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  await createInstance().use(initReactI18next).init({ lng: 'en' });
});
afterAll(() => vi.unstubAllGlobals());

beforeEach(() => {
  vi.clearAllMocks();
  backend = serveChatBackend([
    storedChat('first', 'First chat'),
    storedChat('second', 'Second chat'),
  ]);
});

describe('a host configuring the chat only through ChatConfig', () => {
  it('starts a chat from the new chat and streams its first answer in the conversation', async () => {
    const pending = stream();
    const request = vi.fn<RunEndpoints['send']>(() =>
      Promise.resolve(pending.response),
    );
    renderHost({ send: request }, { kind: 'new' });
    await waitFor(() =>
      expect(screen.getByTestId('chat-model-selector').textContent).toContain(
        'Municipal model',
      ),
    );

    await send('First question');

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: 'started-1',
          text: 'First question',
        }),
        expect.any(AbortSignal),
      ),
    );
    await emit(() => pending.push(text('started-1', 'a1', 'Streaming')));
    expect(await screen.findByText('Streaming')).toBeTruthy();
    await emit(() => {
      pending.push(text('started-1', 'a1', 'Streamed answer'));
      pending.close();
    });
    expect(await screen.findByText('Streamed answer')).toBeTruthy();
  });

  it('stops a streaming answer through the transport', async () => {
    const pending = stream();
    const request = vi.fn<RunEndpoints['send']>(() =>
      Promise.resolve(pending.response),
    );
    const cancel = vi.fn(() => Promise.resolve());
    renderHost(
      { send: request, cancel },
      { kind: 'thread', threadId: 'first' },
    );
    await send('Long answer please');
    await emit(() => pending.push(text('first', 'a1', 'Partial')));
    expect(await screen.findByText('Partial')).toBeTruthy();

    fireEvent.click(screen.getByTestId('cancel'));

    expect(cancel).toHaveBeenCalledWith('first');
    expect(request.mock.calls[0][1].aborted).toBe(true);
    await waitFor(() => expect(screen.getByTestId('send')).toBeTruthy());
    pending.close();
  });

  it('rejoins a run the server has in progress when the chat opens', async () => {
    const pending = stream();
    const follow = vi.fn(() => Promise.resolve(pending.response));
    backend.activeRuns = [{ threadId: 'first', cancellable: true }];
    renderHost(
      { send: vi.fn(), follow, cancel: vi.fn() },
      { kind: 'thread', threadId: 'first' },
    );

    await waitFor(() =>
      expect(follow).toHaveBeenCalledWith('first', expect.any(AbortSignal)),
    );
    await emit(() => {
      pending.push(text('first', 'a1', 'Rejoined answer'));
      pending.close();
    });
    expect(await screen.findByText('Rejoined answer')).toBeTruthy();
  });

  it('keeps a streaming answer while the user switches to another chat and back', async () => {
    const pending = stream();
    const request = vi.fn<RunEndpoints['send']>(() =>
      Promise.resolve(pending.response),
    );
    renderHost({ send: request }, { kind: 'thread', threadId: 'first' });
    await send('Question');
    await emit(() => pending.push(text('first', 'a1', 'Partial')));
    expect(await screen.findByText('Partial')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Host second' }));
    await waitFor(() => expect(screen.queryByText('Partial')).toBeNull());
    await emit(() => pending.push(text('first', 'a1', 'Finished')));
    fireEvent.click(screen.getByRole('button', { name: 'Host first' }));

    await emit(() => pending.close());
    expect(await screen.findByText('Finished')).toBeTruthy();
    expect(request).toHaveBeenCalledOnce();
  });

  it('completes a registered client tool and posts its result to the chat', async () => {
    const execute = vi.fn(() => Promise.resolve('The email says hello'));
    const request = vi.fn((payload: RunMessagePayload) =>
      Promise.resolve(
        new Response(
          chunk(
            payload.toolResult
              ? text('first', 'a2', 'Read it')
              : answer('first', 'a1', [
                  {
                    type: 'tool_use',
                    id: 'call',
                    name: 'read_email',
                    params: {},
                  },
                ]),
          ),
        ),
      ),
    );
    const registry = createClientToolRegistry({ read_email: { execute } });
    renderHost(
      { send: request },
      { kind: 'thread', threadId: 'first' },
      {
        clientTools: {
          registry,
          invoke: async (executor, call) =>
            String(await executor(call, undefined)),
        },
      },
    );

    await send('Read my email');

    expect(await screen.findByText('Read it')).toBeTruthy();
    expect(execute).toHaveBeenCalledOnce();
    expect(request).toHaveBeenLastCalledWith(
      {
        threadId: 'first',
        streaming: true,
        toolResult: {
          toolId: 'call',
          toolName: 'read_email',
          result: 'The email says hello',
        },
      },
      expect.any(AbortSignal),
    );
  });

  it('renames a chat in the conversation and lists it under its new name', async () => {
    renderHost({ send: vi.fn() }, { kind: 'thread', threadId: 'first' });
    const [rename] = await openThreadMenu();
    fireEvent.click(rename);
    fireEvent.change(await screen.findByTestId('rename-input'), {
      target: { value: 'Budget 2027' },
    });
    fireEvent.click(screen.getByTestId('rename-submit'));
    await waitFor(() =>
      expect(backend.chats.get('first')?.title).toBe('Budget 2027'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Host history' }));

    expect(
      await screen.findByRole('link', { name: 'Budget 2027' }),
    ).toBeTruthy();
  });

  it('deletes a chat from the history', async () => {
    renderHost({ send: vi.fn() }, { kind: 'history' });
    const row = (
      await screen.findByRole('link', { name: 'First chat' })
    ).closest('[data-testid="chat-card"]') as HTMLElement;

    fireEvent.click(within(row).getByRole('button'));
    fireEvent.click(await screen.findByTestId('confirmation-confirm'));

    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'First chat' })).toBeNull(),
    );
    expect(backend.chats.has('first')).toBe(false);
    expect(screen.getByRole('link', { name: 'Second chat' })).toBeTruthy();
  });

  it('does not show a chat deleted from the history from the cache', async () => {
    renderHost({ send: vi.fn() }, { kind: 'thread', threadId: 'first' });
    await openThreadMenu();
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Host history' }));
    const row = (
      await screen.findByRole('link', { name: 'First chat' })
    ).closest('[data-testid="chat-card"]') as HTMLElement;
    fireEvent.click(within(row).getByRole('button'));
    fireEvent.click(await screen.findByTestId('confirmation-confirm'));
    await waitFor(() => expect(backend.chats.has('first')).toBe(false));

    fireEvent.click(screen.getByRole('button', { name: 'Host first' }));

    expect(await screen.findByTestId('chat-thread-retry')).toBeTruthy();
    expect(document.querySelector('.content-scroll-header')).toBeNull();
  });

  it('opens a chat from the history', async () => {
    renderHost({ send: vi.fn() }, { kind: 'history' });

    fireEvent.click(await screen.findByRole('link', { name: 'Second chat' }));

    await openThreadMenu();
    expect(
      document.querySelector('.content-scroll-header')?.textContent,
    ).toContain('Second chat');
  });

  it('asks the session for its chats without naming a surface', async () => {
    renderHost({ send: vi.fn() }, { kind: 'history' });
    await screen.findByRole('link', { name: 'First chat' });

    const listed = backend.requests.filter(
      ({ method, url }) => method === 'GET' && url === '/threads',
    );
    expect(listed.map(({ params }) => params)).toEqual([
      { limit: 20, offset: 0 },
    ]);
  });

  it('goes back a page once deleting emptied the last one', async () => {
    backend = serveChatBackend(
      Array.from({ length: 21 }, (_, index) =>
        storedChat(`chat-${index}`, `Chat ${index}`),
      ),
    );
    renderHost({ send: vi.fn() }, { kind: 'history' });
    fireEvent.click(await screen.findByTestId('chat-history-next'));
    const last = await screen.findByRole('link', { name: 'Chat 0' });

    fireEvent.click(
      within(
        last.closest('[data-testid="chat-card"]') as HTMLElement,
      ).getByRole('button'),
    );
    fireEvent.click(await screen.findByTestId('confirmation-confirm'));

    expect(await screen.findByRole('link', { name: 'Chat 20' })).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByTestId('chat-history-next')).toBeNull(),
    );
    expect(screen.getAllByTestId('chat-card')).toHaveLength(20);
  });
});

describe('the embedded new-chat composer', () => {
  it('starts a chat in its fixed workspace from ChatConfig alone', async () => {
    const onThreadStarted = vi.fn();
    const lifecycle = createChatRunLifecycle({
      send: () => Promise.resolve(new Response('')),
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <NewChatComposer
          config={{
            layout: 'page',
            events: { onNewChat: vi.fn(), onThreadStarted },
          }}
          lifecycle={lifecycle}
          workspaceId="workspace-1"
        />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('chat-model-selector').textContent).toContain(
        'Municipal model',
      ),
    );

    await send('Plan the council meeting');

    await waitFor(() => expect(onThreadStarted).toHaveBeenCalledOnce());
    const created = backend.requests.find(
      ({ method, url }) => method === 'POST' && url === '/threads',
    );
    expect(JSON.parse(String(created?.data))).toMatchObject({
      workspaceId: 'workspace-1',
    });
    const started = onThreadStarted.mock.calls[0][0] as {
      thread: GetThreadResponseDto;
    };
    expect(started.thread.id).toBe('started-1');
  });
});
