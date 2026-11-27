import { useState, type ComponentProps, type ReactElement } from 'react';
import type * as ChatMessages from '@ayunis/chat/messages';
import type { QueryClient } from '@tanstack/react-query';
import {
  getActiveRunsControllerFindActiveQueryKey,
  getThreadsControllerFindOneQueryKey,
} from '@ayunis/api-client/endpoints';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChatSurface,
  Conversation,
  createClientToolRegistry,
  type ChatConfig,
  type ConversationProps,
} from '@ayunis/chat/surface';
import { MAX_IMAGE_SIZE_BYTES } from '@ayunis/chat/composer';
import { toast } from '@ayunis/ui/lib/toast';
import {
  createChatRunLifecycle,
  type RunEndpoints,
  type RunMessagePayload,
} from '@ayunis/chat/runs';
import type {
  ActiveThreadRunResponseDto,
  AssistantMessageResponseDto,
  GetThreadResponseDto,
  PermittedLanguageModelResponseDto,
} from '@ayunis/api-client/schemas';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  renderWithQueryClient,
  serveChatApi,
  serveThreads,
  type ServedThread,
} from '@/shared/api/serve-chat-api';

vi.mock('@ayunis/ui/lib/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

/** Counts renders of each answer frame and user message, by unit key and message id. */
const renders = vi.hoisted(() => new Map<string, number>());
vi.mock('@ayunis/chat/messages', async (importOriginal) => {
  const actual = await importOriginal<typeof ChatMessages>();
  const count = (key: string) => renders.set(key, (renders.get(key) ?? 0) + 1);
  return {
    ...actual,
    AssistantMessageFrame(
      props: ComponentProps<typeof actual.AssistantMessageFrame>,
    ) {
      const unit = (props.children as ReactElement<{ unit?: { key: string } }>)
        .props.unit;
      if (unit) count(unit.key);
      return <actual.AssistantMessageFrame {...props} />;
    },
    UserMessage(props: ComponentProps<typeof actual.UserMessage>) {
      count(props.message.id);
      return <actual.UserMessage {...props} />;
    },
  };
});
const sourceUpload = vi.hoisted(() => ({ uploadSourceFile: vi.fn() }));
vi.mock('@ayunis/api-client/source-upload', () => sourceUpload);

beforeAll(async () => {
  Element.prototype.scrollIntoView ??= () => undefined;
  await createInstance()
    .use(initReactI18next)
    .init({
      lng: 'en',
      resources: {
        en: {
          common: {
            chatInput: {
              placeholder: 'Message',
              sendTooltip: 'Send',
              cancelTooltip: 'Stop',
              microphoneTooltip: 'Dictate',
              microphoneRecording: 'Stop recording',
            },
          },
        },
      },
    });
});

let activeRuns: ActiveThreadRunResponseDto[] | Promise<never> = [];

/** The chat API, with the server's runs in progress as the test lists them. */
function serveConversation(routes: Parameters<typeof serveChatApi>[0] = {}) {
  return serveChatApi({ 'GET /runs/active': () => activeRuns, ...routes });
}

beforeEach(() => {
  vi.clearAllMocks();
  renders.clear();
  activeRuns = [];
  serveConversation();
});

function render(
  ui: ReactElement,
  threads: readonly ServedThread[] = [first, second],
) {
  return renderWithQueryClient(ui, threads);
}

function listRuns(client: QueryClient, runs: ActiveThreadRunResponseDto[]) {
  activeRuns = runs;
  client.setQueryData(getActiveRunsControllerFindActiveQueryKey(), runs);
}

function chatConfig<Context = unknown, Outcome = unknown>(
  transport: RunEndpoints,
  overrides: Partial<ChatConfig<Context, Outcome>> = {},
): ChatConfig<Context, Outcome> {
  return {
    sessionKey: 'test-user',
    transport,
    layout: 'page',
    ...overrides,
    events: { onNewChat: vi.fn(), ...overrides.events },
  };
}

class NoResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const visionModel = {
  id: 'vision-model',
  modelId: 'catalog-vision',
  name: 'vision',
  provider: 'mistral',
  displayName: 'Vision',
  canVision: true,
} as PermittedLanguageModelResponseDto;

/** A model that accepts images, so the composer offers image attachments. */
function serveVisionModel(routes: Parameters<typeof serveChatApi>[0] = {}) {
  serveConversation({
    'GET /models/permitted/language-models': [visionModel],
    ...routes,
  });
}

async function imagePicker() {
  const picker = screen.getByTestId<HTMLInputElement>('chat-file-upload-input');
  await waitFor(() => expect(picker.disabled).toBe(false));
  return picker;
}

const first = { id: 'first', title: 'First chat', messages: [], piiMasks: [] };
const second = {
  id: 'second',
  title: 'Second chat',
  messages: [],
  piiMasks: [],
};
type Message = GetThreadResponseDto['messages'][number];

function userMessage(
  id: string,
  content: Array<Record<string, unknown>>,
): Message {
  return {
    id,
    threadId: first.id,
    role: 'user',
    createdAt: '2026-11-24T12:00:00Z',
    content,
  } as unknown as Message;
}

function TestHost(props: Pick<ConversationProps, 'config'>) {
  const [thread, setThread] = useState(first);
  return (
    <>
      <button type="button" onClick={() => setThread(first)}>
        {first.title}
      </button>
      <button type="button" onClick={() => setThread(second)}>
        {second.title}
      </button>
      <Conversation {...props} threadId={thread.id} />
    </>
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
    NonNullable<ChatConfig['clientTools']>,
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
    config: chatConfig<undefined, string>(
      { send: request },
      {
        events: { onNewChat: vi.fn(), onRunSettled },
        clientTools: {
          registry: createClientToolRegistry<undefined, string>({
            read_context: { execute },
          }),
          invoke: (executor, call) => executor(call, undefined),
          ...policy,
        },
      },
    ),
  } satisfies Omit<ConversationProps<undefined, string>, 'threadId'>;
  const saved: ServedThread = { ...first, messages: [toolCall.message] };
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
  it('replaces the composer with a new-chat offer once the chat model is no longer permitted', async () => {
    const onNewChat = vi.fn();
    const withdrawn = { ...first, permittedModelId: 'withdrawn-model' };
    render(
      <Conversation
        threadId={withdrawn.id}
        config={chatConfig({ send: vi.fn() }, { events: { onNewChat } })}
      />,
      [withdrawn],
    );

    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Message' })).toBeNull(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'newChat.newChat' }));
    expect(onNewChat).toHaveBeenCalledOnce();
  });

  it('holds a message while a file of the chat processes and sends it once the file is ready', async () => {
    const pending = stream();
    const request = vi.fn(async () => pending.response);
    const processing = {
      ...first,
      sources: [
        { id: 'source-1', name: 'notes.txt', status: 'processing' },
      ] as GetThreadResponseDto['sources'],
    };
    serveConversation({ 'GET /threads/first/sources/progress': [] });
    vi.stubGlobal('ResizeObserver', NoResizeObserver);
    const { client } = render(
      <Conversation
        threadId={first.id}
        config={chatConfig({ send: request })}
      />,
      [processing],
    );

    send('Wait for the file');
    expect(request).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('Wait for the file')).toBeNull();
    expect(screen.getByTestId('pending-user-message').textContent).toContain(
      'Wait for the file',
    );

    const threadKey = getThreadsControllerFindOneQueryKey(first.id);
    await waitFor(() =>
      expect(client.isFetching({ queryKey: threadKey })).toBe(0),
    );
    await act(async () => serveThreads([first], client));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: first.id,
          text: 'Wait for the file',
        }),
        expect.any(AbortSignal),
      ),
    );
    await act(async () => {
      pending.push(answer(first.id, 'a1', 'Ready now'));
      pending.close();
    });
    expect(await screen.findByText('Ready now')).toBeTruthy();
  });

  it('shows a first message waiting for its file instead of the empty state', () => {
    const processing = {
      ...first,
      sources: [
        { id: 'source-1', name: 'notes.txt', status: 'processing' },
      ] as GetThreadResponseDto['sources'],
    };
    serveConversation({ 'GET /threads/first/sources/progress': [] });
    vi.stubGlobal('ResizeObserver', NoResizeObserver);
    render(
      <Conversation
        threadId={first.id}
        config={chatConfig({ send: vi.fn() })}
        emptyState={<p data-testid="empty-chat" />}
      />,
      [processing],
    );
    expect(screen.getByTestId('empty-chat')).toBeTruthy();

    send('Wait for the file');

    expect(screen.queryByTestId('empty-chat')).toBeNull();
    expect(screen.getByTestId('pending-user-message').textContent).toContain(
      'Wait for the file',
    );
  });

  it('takes a waiting message back into the composer when it is stopped', () => {
    const request = vi.fn(async () => new Response(null, { status: 204 }));
    const processing = {
      ...first,
      sources: [
        { id: 'source-1', name: 'notes.txt', status: 'processing' },
      ] as GetThreadResponseDto['sources'],
    };
    serveConversation({ 'GET /threads/first/sources/progress': [] });
    vi.stubGlobal('ResizeObserver', NoResizeObserver);
    render(
      <Conversation
        threadId={first.id}
        config={chatConfig({ send: request })}
      />,
      [processing],
    );

    send('Never mind');
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

    expect(screen.getByDisplayValue('Never mind')).toBeTruthy();
    expect(screen.queryByTestId('pending-user-message')).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('puts a message whose send failed back into the composer', async () => {
    const request = vi.fn(async () => {
      throw new Error('Offline');
    });
    render(
      <Conversation
        threadId={first.id}
        config={chatConfig({ send: request })}
      />,
    );

    send('Keep this prompt');
    expect(screen.queryByDisplayValue('Keep this prompt')).toBeNull();

    expect(await screen.findByDisplayValue('Keep this prompt')).toBeTruthy();
  });

  it('does not clear the draft while an active run is being checked', () => {
    const request = vi.fn(async () => new Response(null, { status: 204 }));
    activeRuns = new Promise<never>(() => undefined);
    render(
      <Conversation
        threadId={first.id}
        config={chatConfig({ send: request, follow: vi.fn() })}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
      target: { value: 'Keep this draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByDisplayValue('Keep this draft')).toBeTruthy();
    expect(screen.queryByTestId('pending-user-message')).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('does not render an empty actions row for tool-only runs', () => {
    const toolOnly = event(first.id, 'a1', [
      { type: 'tool_use', id: 'call', name: 'read_context', params: {} },
    ]).message;
    const thread = { ...first, messages: [toolOnly] };
    render(
      <Conversation
        threadId={thread.id}
        config={chatConfig({ send: vi.fn() })}
      />,
      [thread],
    );

    expect(
      screen.getByTestId('assistant-message').nextElementSibling,
    ).toBeNull();
  });

  it('does not rerender existing user messages during active-run polling', async () => {
    const thread = {
      ...first,
      messages: [
        userMessage('u1', [
          { type: 'text', text: 'First' },
          { type: 'image', index: 0, altText: 'Plan' },
        ]),
      ],
    };
    const { client } = render(
      <Conversation
        threadId={thread.id}
        config={chatConfig({ send: vi.fn() })}
      />,
      [thread],
    );
    await waitFor(() => expect(renders.get('u1')).toBeGreaterThan(0));
    const before = renders.get('u1');

    await act(async () => listRuns(client, []));
    await act(async () => listRuns(client, []));

    expect(renders.get('u1')).toBe(before);
  });

  it('does not rerender completed assistant runs while the next run streams', async () => {
    const pending = stream();
    const request = vi.fn(async () => pending.response);
    const completed = answer(first.id, 'a1', 'Completed answer').message;
    const thread = {
      ...first,
      messages: [
        userMessage('u1', [{ type: 'text', text: 'First' }]),
        completed,
      ],
    };
    const config = chatConfig(
      { send: request },
      { events: { onNewChat: vi.fn(), onMessageCopied: vi.fn() } },
    );
    const { client } = render(
      <Conversation threadId={thread.id} config={config} />,
      [thread],
    );

    send('Next question');
    const nextUser = event(first.id, 'u2', [
      { type: 'text', text: 'Next question' },
    ]);
    await act(async () => {
      pending.push({
        ...nextUser,
        message: { ...nextUser.message, role: 'user' },
      });
    });
    await act(async () => {
      pending.push(answer(first.id, 'a2', 'Par'));
    });
    expect(await screen.findByText('Par')).toBeTruthy();
    const completedRenders = renders.get('run-a1');
    await act(async () => listRuns(client, []));
    await act(async () => {
      pending.push(answer(first.id, 'a2', 'Partial answer'));
    });

    expect(await screen.findByText('Partial answer')).toBeTruthy();
    expect(renders.get('run-a1')).toBe(completedRenders);
    await act(async () => pending.close());
  });

  it('preserves per-chat drafts and resumes rendering the first run after switching chats', async () => {
    const pending = stream();
    const request = vi.fn(async () => pending.response);
    render(<TestHost config={chatConfig({ send: request })} />);
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

  it('shows the sent text as pending until the batched user message reaches the timeline', async () => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    });
    const pending = stream();
    try {
      const request = vi.fn(async () => pending.response);
      render(<TestHost config={chatConfig({ send: request })} />);
      send('Visible prompt');
      expect(screen.queryByDisplayValue('Visible prompt')).toBeNull();
      expect(screen.getByTestId('pending-user-message').textContent).toContain(
        'Visible prompt',
      );
      const echoed = answer(first.id, 'u1', 'Visible prompt');
      await act(async () =>
        pending.push({
          ...echoed,
          message: { ...echoed.message, role: 'user' },
        }),
      );
      act(() => vi.advanceTimersToNextFrame());
      expect(screen.getByTestId('user-message').textContent).toContain(
        'Visible prompt',
      );
      expect(screen.queryByTestId('pending-user-message')).toBeNull();
    } finally {
      await act(async () => pending.close());
      vi.useRealTimers();
    }
  });

  it('lets the host observe a run without owning its lifecycle', async () => {
    const pending = stream();
    const request = vi.fn(async () => pending.response);
    const observer = {
      onEvent: vi.fn(),
      onComplete: vi.fn(),
    };
    const observeRun = vi.fn(() => observer);
    const onRunSettled = vi.fn();
    render(
      <Conversation
        threadId={first.id}
        config={chatConfig(
          { send: request },
          { events: { onNewChat: vi.fn(), observeRun, onRunSettled } },
        )}
      />,
    );

    send('Observed prompt');
    const message = answer(first.id, 'a1', 'Observed answer');
    await act(async () => {
      pending.push(message);
      pending.close();
    });

    expect(observeRun).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        threadId: first.id,
        text: 'Observed prompt',
      }),
      false,
      undefined,
    );
    expect(observer.onEvent).toHaveBeenCalledWith(message);
    expect(observer.onComplete).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ failed: false }),
      expect.any(AbortSignal),
    );
    expect(onRunSettled).toHaveBeenCalledExactlyOnceWith(
      first.id,
      expect.objectContaining({ failed: false }),
    );
  });

  it('takes over a first message started before navigation and shows it as pending', async () => {
    const pending = stream();
    const request = vi.fn(async () => pending.response);
    const lifecycle = createChatRunLifecycle({ send: request });
    lifecycle.startThreadRun({
      threadId: first.id,
      text: 'Started before navigation',
      images: [],
      messageCountBeforeSend: 0,
    });

    render(
      <Conversation
        lifecycle={lifecycle}
        threadId={first.id}
        config={chatConfig({ send: request })}
      />,
    );
    expect(screen.getByTestId('pending-user-message').textContent).toContain(
      'Started before navigation',
    );
    await act(async () => {
      pending.push(answer(first.id, 'a1', 'Handoff complete'));
      pending.close();
    });

    expect(await screen.findByText('Handoff complete')).toBeTruthy();
    expect(request).toHaveBeenCalledOnce();
  });

  it('places the context hint directly before the first user turn', () => {
    const persisted = {
      ...first,
      messages: [
        event(first.id, 'a1', [{ type: 'text', text: 'Earlier answer' }])
          .message,
        userMessage('u1', [{ type: 'text', text: 'First question' }]),
      ],
    };
    const open = vi.fn();
    render(
      <Conversation
        threadId={persisted.id}
        config={chatConfig(
          { send: vi.fn() },
          {
            contextHint: {
              summary: { skills: 2, knowledgeBases: 1 },
              open,
            },
          },
        )}
      />,
      [persisted],
    );
    const hint = screen.getByTestId('chat-context-hint');
    const message = screen.getByTestId('user-message');
    expect(
      hint.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.click(hint);
    expect(open).toHaveBeenCalledOnce();
  });

  it('shows no context hint without a user turn or while its summary is unknown', () => {
    const asked = {
      ...first,
      messages: [userMessage('u1', [{ type: 'text', text: 'Question' }])],
    };
    const { unmount } = render(
      <Conversation
        threadId={first.id}
        config={chatConfig(
          { send: vi.fn() },
          {
            contextHint: {
              summary: { skills: 0, knowledgeBases: 0 },
              open: vi.fn(),
            },
          },
        )}
      />,
    );
    expect(screen.queryByTestId('chat-context-hint')).toBeNull();
    unmount();

    render(
      <Conversation
        threadId={asked.id}
        config={chatConfig(
          { send: vi.fn() },
          { contextHint: { summary: null, open: vi.fn() } },
        )}
      />,
      [asked],
    );
    expect(screen.queryByTestId('chat-context-hint')).toBeNull();
  });

  it('renders a routine nudge as a notice instead of a user bubble', () => {
    const nudged = {
      ...first,
      messages: [
        userMessage('nudge', [
          { type: 'text', text: 'Check in later', isNudge: true },
        ]),
      ],
    };
    render(
      <Conversation
        threadId={nudged.id}
        config={chatConfig({ send: vi.fn() })}
      />,
      [nudged],
    );
    expect(screen.getByTestId('routine-nudge').textContent).toContain(
      'Check in later',
    );
    expect(screen.queryByTestId('user-message')).toBeNull();
  });

  it('copies the resolved user prompt and reports the host action', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write: vi.fn(), writeText },
    });
    const onMessageCopied = vi.fn();
    const masked = {
      ...first,
      piiMasks: [
        {
          id: 'mask-1',
          token: '{{pii:PERSON_NAME_1}}',
          value: 'Erika Mustermann',
          category: 'person_name',
          unmasked: false,
        },
      ],
      messages: [
        userMessage('u1', [
          {
            type: 'text',
            text: 'Internal skill instruction',
            isSkillInstruction: true,
          },
          {
            type: 'text',
            text: 'Schreibe **{{pii:PERSON_NAME_1}}** eine Antwort',
          },
        ]),
      ],
    } as ServedThread;
    render(
      <Conversation
        threadId={masked.id}
        config={chatConfig(
          { send: vi.fn() },
          { events: { onNewChat: vi.fn(), onMessageCopied } },
        )}
      />,
      [masked],
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'chat.copyToClipboard' }),
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        'Schreibe **Erika Mustermann** eine Antwort',
      ),
    );
    expect(onMessageCopied).toHaveBeenCalledWith('user');
  });

  it('reports a copied code block of an answer to the host', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write: vi.fn(), writeText: vi.fn(async () => undefined) },
    });
    const onCodeCopied = vi.fn();
    const coded = {
      ...first,
      messages: [
        answer(first.id, 'a1', '```js\nconst permit = 1;\n```').message,
      ],
    };
    render(
      <Conversation
        threadId={coded.id}
        config={chatConfig(
          { send: vi.fn() },
          { events: { onNewChat: vi.fn(), onCodeCopied } },
        )}
      />,
      [coded],
    );
    const [copyCode] = screen.getAllByRole('button', {
      name: 'chat.copyToClipboard',
    });

    fireEvent.click(copyCode);

    await waitFor(() => expect(onCodeCopied).toHaveBeenCalledOnce());
  });

  it('keeps a new draft on the selected thread when a previous thread is accepted', async () => {
    const pending = stream();
    const request = vi
      .fn<RunEndpoints['send']>()
      .mockResolvedValue(pending.response);
    render(<TestHost config={chatConfig({ send: request })} />);
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

  it('keeps a follow-up image when the sent message is accepted later', async () => {
    const pending = stream();
    const request = vi.fn(async () => pending.response);
    const sent = new File(['sent'], 'sent.png', { type: 'image/png' });
    const followUp = new File(['follow-up'], 'follow-up.png', {
      type: 'image/png',
    });
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override readonly createObjectURL = (file: File) =>
          `blob:${file.name}`;
        static override readonly revokeObjectURL = () => undefined;
      },
    );
    serveVisionModel();
    const vision = { ...first, permittedModelId: visionModel.id };
    const { unmount } = render(
      <Conversation
        threadId={vision.id}
        config={chatConfig({ send: request })}
      />,
      [vision],
    );
    try {
      fireEvent.change(await imagePicker(), {
        target: { files: [sent] },
      });
      send('First prompt');
      fireEvent.change(await imagePicker(), {
        target: { files: [followUp] },
      });
      expect(screen.getByRole('img', { name: 'follow-up.png' })).toBeDefined();

      await act(async () => {
        pending.push({
          type: 'message',
          message: userMessage('u1', [{ type: 'text', text: 'First prompt' }]),
        });
        pending.close();
      });

      expect(screen.getByRole('img', { name: 'follow-up.png' })).toBeDefined();
    } finally {
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it('aborts the old session and opens a fresh draft when the principal changes', async () => {
    const prior = stream();
    const request = vi
      .fn<RunEndpoints['send']>()
      .mockResolvedValueOnce(prior.response)
      .mockResolvedValueOnce(
        new Response(chunk(answer(first.id, 'a2', 'New session response'))),
      );
    const onRunSettled = vi.fn();
    const config = (sessionKey: string) =>
      chatConfig(
        { send: request },
        { sessionKey, events: { onNewChat: vi.fn(), onRunSettled } },
      );
    const { rerender } = render(
      <Conversation threadId={first.id} config={config('first-user')} />,
    );
    send('Old session prompt');
    const signal = request.mock.calls[0][1];
    await act(async () => {
      rerender(
        <Conversation threadId={first.id} config={config('second-user')} />,
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
    activeRuns = [{ threadId: first.id, cancellable: true }];
    render(
      <Conversation
        threadId={first.id}
        config={chatConfig({ send: request, follow, cancel })}
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

  it('removes an unsaved streaming tool call when the shared runtime stops', async () => {
    const pending = stream();
    const request = vi.fn(async () => pending.response);
    const cancel = vi.fn(async () => undefined);
    const onThreadState = vi.fn();
    render(
      <Conversation
        threadId={first.id}
        config={chatConfig(
          { send: request, cancel },
          { events: { onNewChat: vi.fn(), onThreadState } },
        )}
      />,
    );
    send('Create a document');
    await act(async () =>
      pending.push(
        event(first.id, 'a1', [
          {
            type: 'tool_use',
            id: 'call',
            name: 'create_document',
            params: {},
            stream: { status: 'streaming', argumentsJson: '' },
          },
        ]),
      ),
    );
    await waitFor(() =>
      expect(onThreadState.mock.calls.at(-1)?.[0].messages).toHaveLength(1),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

    await waitFor(() =>
      expect(onThreadState.mock.calls.at(-1)?.[0].messages).toHaveLength(0),
    );
    expect(cancel).toHaveBeenCalledWith(first.id);
    pending.close();
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
      <Conversation
        threadId={first.id}
        config={chatConfig(
          { send: request },
          {
            clientTools: {
              registry,
              invoke: (executor, call) => executor(call, undefined),
            },
          },
        )}
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
    activeRuns = [{ threadId: first.id, cancellable: true }];
    render(
      <Conversation
        {...props}
        config={{ ...props.config, transport: { follow, send: request } }}
        threadId={saved.id}
      />,
      [saved],
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
    const { client, rerender } = render(
      <Conversation {...props} threadId={first.id} />,
    );
    send('Read this context');
    await finish();
    await waitFor(() => expect(execute).toHaveBeenCalledOnce());

    rerender(<Conversation {...props} threadId={second.id} />);
    await act(async () => finishFirstRead?.('read from the old view'));
    expect(request).toHaveBeenCalledTimes(1);
    serveThreads([saved], client);
    rerender(<Conversation {...props} threadId={saved.id} />);

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
      const { client, rerender } = render(
        <Conversation {...props} threadId={first.id} />,
      );
      send('Read the original context');
      rerender(<Conversation {...props} threadId={second.id} />);
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
      serveThreads([stale], client);
      listRuns(client, [{ threadId: first.id, cancellable: true }]);
      rerender(
        <Conversation
          {...props}
          config={{ ...props.config, transport: { send: request, follow } }}
          threadId={stale.id}
        />,
      );
      await waitFor(() =>
        expect(props.config.events.onRunSettled).toHaveBeenCalledTimes(2),
      );
      expect(follow).toHaveBeenCalledWith(first.id, expect.any(AbortSignal));
      expect(execute).not.toHaveBeenCalled();
      listRuns(client, []);
      serveThreads([saved], client);
      rerender(<Conversation {...props} threadId={saved.id} />);
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
      rerender(<Conversation {...props} threadId={second.id} />);
      rerender(<Conversation {...props} threadId={saved.id} />);
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
      <Conversation {...props} config={config} threadId={second.id} />,
      [saved, second],
    );

    rerender(<Conversation {...props} config={config} threadId={saved.id} />);
    expect(canDispatch).toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();

    canDispatch.mockReturnValue(true);
    rerender(
      <Conversation {...props} config={{ ...config }} threadId={saved.id} />,
    );
    expect(await screen.findByText('Done')).toBeTruthy();
    expect(request).toHaveBeenCalledOnce();
  });

  it('keeps deferred results queued until the selected host can dispatch', async () => {
    const canDispatch = vi.fn(() => false);
    const { props, saved, request, execute, finish } = deferredToolRun({
      canDispatch,
    });
    const { client, rerender } = render(
      <Conversation {...props} threadId={first.id} />,
    );
    send('Read the original context');
    rerender(<Conversation {...props} threadId={second.id} />);
    await finish();
    serveThreads([saved], client);
    rerender(<Conversation {...props} threadId={saved.id} />);
    expect(canDispatch).toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);

    canDispatch.mockReturnValue(true);
    rerender(
      <Conversation
        {...props}
        config={{ ...props.config }}
        threadId={saved.id}
      />,
    );
    expect(await screen.findByText('Done')).toBeTruthy();
    expect(execute).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('posts a deferred result when its context matches again without reopening the thread', async () => {
    const { props, saved, request, execute, finish } = deferredToolRun({
      contextKey: 'original',
    });
    const { client, rerender } = render(
      <Conversation {...props} threadId={first.id} />,
    );
    send('Read the original context');
    rerender(<Conversation {...props} threadId={second.id} />);
    await finish();

    serveThreads([saved], client);
    rerender(
      <Conversation
        {...props}
        threadId={saved.id}
        config={{
          ...props.config,
          clientTools: {
            ...props.config.clientTools!,
            contextKey: 'different',
          },
        }}
      />,
    );
    expect(execute).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);

    rerender(<Conversation {...props} threadId={saved.id} />);
    expect(await screen.findByText('Done')).toBeTruthy();
    expect(execute).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('queues tool results when the selected context changes before the run finishes', async () => {
    const { props, request, execute, finish } = deferredToolRun({
      contextKey: 'original',
    });
    const { rerender } = render(
      <Conversation {...props} threadId={first.id} />,
    );
    send('Read the original context');
    rerender(
      <Conversation
        {...props}
        threadId={first.id}
        config={{
          ...props.config,
          clientTools: {
            ...props.config.clientTools!,
            contextKey: 'different',
          },
        }}
      />,
    );

    await finish();
    expect(execute).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);

    rerender(<Conversation {...props} threadId={first.id} />);
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
      const { client, rerender } = render(
        <Conversation {...props} threadId={first.id} />,
      );
      send('Read the original context');
      rerender(<Conversation {...props} threadId={second.id} />);
      await finish();

      serveThreads([saved], client);
      await act(async () => {
        rerender(
          <Conversation
            {...props}
            threadId={saved.id}
            config={{
              ...props.config,
              sessionKey,
              clientTools: {
                ...props.config.clientTools!,
                contextKey,
                resumeOnOpen: resume === undefined ? undefined : () => resume,
              },
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
      const requests = serveConversation({
        'GET /feature-toggles': { voiceEnabled: true },
      });
      const send = vi.fn(async () => new Response(null, { status: 204 }));
      render(<TestHost config={chatConfig({ send })} />);
      const dictate = await screen.findByRole('button', { name: 'Dictate' });
      await act(async () => {
        fireEvent.click(dictate);
      });
      vi.setSystemTime(Date.now() + 2000);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }));
      });

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(
        requests.filter(({ url }) => url === '/transcriptions'),
      ).toHaveLength(1);
      expect(toast.error).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('reports a failed send to the host once', async () => {
    const onError = vi.fn();
    const request = vi.fn(async () => {
      throw new Error('Offline');
    });
    render(
      <Conversation
        threadId={first.id}
        config={chatConfig(
          { send: request },
          { events: { onNewChat: vi.fn(), onError } },
        )}
      />,
    );

    send('Try to send');

    await waitFor(() => expect(onError).toHaveBeenCalledOnce());
  });

  it('keeps an accepted photo and explains why the larger one was rejected', async () => {
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
    serveVisionModel();
    const vision = { ...first, permittedModelId: visionModel.id };
    const { unmount } = render(
      <Conversation threadId={vision.id} config={chatConfig({ send })} />,
      [vision],
    );
    try {
      fireEvent.change(await imagePicker(), {
        target: { files: [valid, oversized] },
      });

      expect(screen.getByRole('img', { name: 'small.png' })).toBeDefined();
      expect(screen.queryByRole('img', { name: 'large.png' })).toBeNull();
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(
        'chatInput.imageTooLarge',
        expect.anything(),
      );
    } finally {
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it.each([
    ['fails', () => Promise.reject(new Error('Offline'))],
    ['is still running', () => new Promise<never>(() => undefined)],
  ])(
    'shows an uploaded source once and sends nothing while it processes when the thread refresh %s',
    async (_state, refreshThread) => {
      serveConversation({
        'GET /models/embedding/enabled': { isEmbeddingModelEnabled: true },
        'GET /threads/first': refreshThread,
        'GET /threads/first/sources/progress': [],
      });
      sourceUpload.uploadSourceFile.mockResolvedValue([
        {
          id: 'source-1',
          threadId: first.id,
          name: 'notes.txt',
          type: 'text',
          createdBy: 'user',
          status: 'processing',
        },
      ]);
      vi.stubGlobal(
        'ResizeObserver',
        class {
          observe() {}
          unobserve() {}
          disconnect() {}
        },
      );
      const send = vi.fn(async () => new Response(null, { status: 204 }));
      render(
        <Conversation threadId={first.id} config={chatConfig({ send })} />,
      );
      const picker = screen.getByTestId<HTMLInputElement>(
        'chat-file-upload-input',
      );
      await waitFor(() => expect(picker.accept).not.toBe('image/*'));

      fireEvent.change(picker, {
        target: {
          files: [new File(['notes'], 'notes.txt', { type: 'text/plain' })],
        },
      });

      await waitFor(() =>
        expect(
          screen
            .getAllByTestId('chat-source')
            .map((chip) => chip.getAttribute('data-source-id')),
        ).toEqual(['source-1']),
      );
      fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
        target: { value: 'Summarise the notes' },
      });
      fireEvent.click(screen.getByTestId('send'));
      expect(send).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    },
  );

  it('does not upload a document dropped while a reply streams', async () => {
    const pending = stream();
    const requests = serveConversation({
      'GET /models/embedding/enabled': { isEmbeddingModelEnabled: true },
    });
    render(
      <Conversation
        threadId={first.id}
        config={chatConfig({ send: vi.fn(async () => pending.response) })}
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByTestId<HTMLInputElement>('chat-file-upload-input').accept,
      ).not.toBe('image/*'),
    );
    send('Summarise the permit');

    fireEvent.drop(screen.getByTestId('chat-input'), {
      dataTransfer: {
        files: [
          new File(['permit'], 'permit.pdf', { type: 'application/pdf' }),
        ],
      },
    });
    await act(() => Promise.resolve());

    expect(requests.some(({ method }) => method === 'POST')).toBe(false);
    await act(async () => pending.close());
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

describe('package-owned conversation surface', () => {
  const chunkId = '6a1f6c64-8d7c-4f3e-9c55-0f2d0d3b9a11';
  const origin = {
    kind: 'release_note',
    releaseNoteId: 'note-1',
  } as GetThreadResponseDto['origin'];

  async function openThreadMenu() {
    const trigger = document.querySelector<HTMLButtonElement>(
      '.content-scroll-header button[aria-haspopup="menu"]',
    );
    if (!trigger) throw new Error('No thread menu');
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    return screen.findAllByRole('menuitem');
  }

  it('shows only the header controls whose data the surface passes', async () => {
    serveConversation({
      'GET /feature-toggles': { releaseNotesEnabled: true },
    });
    const thread = { ...first, origin };
    render(
      <Conversation
        threadId={thread.id}
        config={chatConfig({ send: vi.fn() })}
      />,
      [thread],
    );

    expect((await openThreadMenu()).map((item) => item.textContent)).toEqual([
      'chat.renameThread',
      'chat.deleteThread',
    ]);
    expect(screen.queryByTestId('chat-side-panel-toggle')).toBeNull();
    expect(screen.queryByTestId('chat-header-new-chat')).toBeNull();
    expect(screen.queryByTestId('chat-source-release-note')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'sidebar.pinChat' }),
    ).toBeNull();
  });

  it('offers the controls of the data a surface passes', async () => {
    serveConversation({
      'GET /feature-toggles': { releaseNotesEnabled: true },
    });
    const start = vi.fn();
    const toggleArtifacts = vi.fn();
    const onNavigate = vi.fn();
    const thread = { ...first, origin };
    render(
      <Conversation
        threadId={thread.id}
        config={chatConfig(
          { send: vi.fn() },
          {
            newChat: { start },
            favorites: { isFavorite: () => false, toggle: vi.fn() },
            artifactPanel: { open: false, toggle: toggleArtifacts },
            workspaces: { items: [], moveThread: vi.fn(), create: vi.fn() },
            events: {
              onNewChat: vi.fn(),
              onNavigate,
              hrefFor: () => '/news/note-1',
            },
          },
        )}
      />,
      [thread],
    );

    fireEvent.click(screen.getByTestId('chat-header-new-chat'));
    fireEvent.click(screen.getByTestId('chat-side-panel-toggle'));
    fireEvent.click(await screen.findByTestId('chat-source-release-note'));
    expect(start).toHaveBeenCalledOnce();
    expect(toggleArtifacts).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith({
      kind: 'releaseNote',
      releaseNoteId: 'note-1',
    });
    expect(
      screen.getByRole('button', { name: 'sidebar.pinChat' }),
    ).toBeTruthy();
    expect(await openThreadMenu()).toHaveLength(3);
  });

  it('deletes the chat after confirmation and lets the host leave it', async () => {
    const requests = serveConversation({ 'DELETE /threads/first': null });
    const onThreadDeleted = vi.fn();
    render(
      <Conversation
        threadId={first.id}
        config={chatConfig(
          { send: vi.fn() },
          { events: { onNewChat: vi.fn(), onThreadDeleted } },
        )}
      />,
    );

    const items = await openThreadMenu();
    fireEvent.click(items[items.length - 1]);
    fireEvent.click(await screen.findByTestId('confirmation-confirm'));

    await waitFor(() => expect(onThreadDeleted).toHaveBeenCalledWith('first'));
    expect(
      requests
        .filter(({ method }) => method === 'DELETE')
        .map(({ url }) => url),
    ).toEqual(['/threads/first']);
  });

  it.each([
    ['links', true],
    ['does not link', false],
  ])(
    'opens a cited source in the dialog and %s the recording when the host navigates',
    async (_case, navigates) => {
      serveConversation({
        [`GET /threads/first/source-chunks/${chunkId}`]: {
          source: { id: 'source-1', name: 'Council meeting', url: null },
          chunk: {
            content: 'The budget passed.',
            startLine: null,
            endLine: null,
          },
          recording: {
            id: 'recording-1',
            name: 'Council meeting',
            uploadedAt: '2026-11-20T10:00:00Z',
            position: 'transcript',
            start: 12,
            end: 30,
            speakerNumbers: [1],
          },
        },
      });
      const cited = {
        ...first,
        messages: [
          answer(first.id, 'a1', `It passed {{source:${chunkId}|Meeting}}.`)
            .message,
        ],
      };
      const onNavigate = vi.fn();
      render(
        <Conversation
          threadId={cited.id}
          config={chatConfig(
            { send: vi.fn() },
            {
              events: navigates
                ? { onNewChat: vi.fn(), onNavigate }
                : { onNewChat: vi.fn() },
            },
          )}
        />,
        [cited],
      );

      fireEvent.click(screen.getByTestId('source-citation'));

      expect(
        (await screen.findByTestId('source-citation-excerpt')).textContent,
      ).toContain('The budget passed.');
      const recording = screen.queryByTestId('source-citation-open-recording');
      expect(recording !== null).toBe(navigates);
      if (recording) {
        fireEvent.click(recording);
        expect(onNavigate).toHaveBeenCalledWith({
          kind: 'recording',
          recordingId: 'recording-1',
        });
      }
    },
  );

  it('reveals a masked value after confirmation without refetching the chat', async () => {
    const mask = {
      id: 'mask-1',
      token: '{{pii:PERSON_NAME_1}}',
      value: 'Erika Mustermann',
      category: 'person_name',
      unmasked: false,
    };
    const requests = serveConversation({
      'POST /threads/first/pii-masks/mask-1/unmask': [
        { ...mask, unmasked: true },
      ],
    });
    const masked = {
      ...first,
      piiMasks: [mask],
      messages: [
        answer(first.id, 'a1', 'Antwort an {{pii:PERSON_NAME_1}}').message,
      ],
    } as ServedThread;
    const { client } = render(
      <Conversation
        threadId={masked.id}
        config={chatConfig({ send: vi.fn() })}
      />,
      [masked],
    );
    await waitFor(() =>
      expect(
        requests.filter(({ url }) => url === '/threads/first'),
      ).toHaveLength(1),
    );

    fireEvent.click(screen.getByTestId('pii-mask'));
    fireEvent.click(await screen.findByTestId('confirmation-confirm'));

    expect(await screen.findByTestId('pii-mask-unmasked')).toBeTruthy();
    expect(
      client.getQueryData<GetThreadResponseDto>(
        getThreadsControllerFindOneQueryKey(first.id),
      )?.piiMasks,
    ).toEqual([{ ...mask, unmasked: true }]);
    expect(requests.filter(({ url }) => url === '/threads/first')).toHaveLength(
      1,
    );
  });
});
