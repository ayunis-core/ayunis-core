import { createRef, useState, type ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getThreadsControllerFindOneQueryKey } from '@ayunis/api-client/endpoints';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChatConversation,
  ChatSurface,
  createClientToolRegistry,
  type ChatConfig,
  type ChatConversationHandle,
  type ChatConversationProps,
  type ChatThreadSnapshot,
} from '@ayunis/chat/surface';
import { MAX_IMAGE_SIZE_BYTES } from '@ayunis/chat/composer';
import { toast } from '@ayunis/ui/lib/toast';
import {
  createChatRunLifecycle,
  type RunEndpoints,
  type RunMessagePayload,
} from '@ayunis/chat/runs';
import type {
  AssistantMessageResponseDto,
  GetThreadResponseDto,
  PermittedLanguageModelResponseDto,
} from '@ayunis/api-client/schemas';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  renderWithQueryClient,
  serveChatApi,
} from '@/shared/api/serve-chat-api';

vi.mock('@ayunis/ui/lib/toast', () => ({ toast: { error: vi.fn() } }));
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

beforeEach(() => {
  vi.clearAllMocks();
  serveChatApi();
});

const render = (ui: ReactElement) => renderWithQueryClient(ui);

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
  serveChatApi({
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

function TestHost(props: Pick<ChatConversationProps, 'config' | 'adapters'>) {
  const [thread, setThread] = useState(first);
  return (
    <>
      <button type="button" onClick={() => setThread(first)}>
        {first.title}
      </button>
      <button type="button" onClick={() => setThread(second)}>
        {second.title}
      </button>
      <ChatConversation {...props} thread={thread} />
    </>
  );
}

function NudgeNotice({ text }: Readonly<{ text: string }>) {
  return <aside data-testid="routine-nudge">{text}</aside>;
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
  it('replaces the composer with a new-chat offer once the chat model is no longer permitted', async () => {
    const onNewChat = vi.fn();
    const conversation = createRef<ChatConversationHandle>();
    render(
      <ChatConversation
        conversationRef={conversation}
        thread={{ ...first, permittedModelId: 'withdrawn-model' }}
        config={chatConfig({ send: vi.fn() }, { events: { onNewChat } })}
      />,
    );

    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Message' })).toBeNull(),
    );
    expect(
      conversation.current?.restoreFailedSubmission('Keep this prompt', []),
    ).toBeUndefined();
    fireEvent.click(screen.getByRole('button'));
    expect(onNewChat).toHaveBeenCalledOnce();
  });

  it('lets a neutral host defer a send and resume it through the conversation handle', async () => {
    const pending = stream();
    const request = vi.fn(async () => pending.response);
    const lifecycle = createChatRunLifecycle({ send: request });
    const conversation = createRef<ChatConversationHandle>();
    const deferSend = vi.fn(() => true);
    render(
      <ChatConversation
        conversationRef={conversation}
        lifecycle={lifecycle}
        thread={first}
        config={chatConfig({ send: request })}
        composer={{ clearOnSend: true }}
        adapters={{ deferSend }}
      />,
    );

    send('Wait for the host');
    expect(deferSend).toHaveBeenCalledWith(
      first.id,
      expect.objectContaining({ text: 'Wait for the host' }),
    );
    expect(request).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('Wait for the host')).toBeNull();

    lifecycle.startThreadRun({
      threadId: first.id,
      text: 'Wait for the host',
      images: [],
    });
    expect(conversation.current?.resumeStartedRun()).toBe(true);
    await act(async () => {
      pending.push(answer(first.id, 'a1', 'Ready now'));
      pending.close();
    });
    expect(await screen.findByText('Ready now')).toBeTruthy();
  });

  it('does not clear or hand a draft to the host while an active run is being checked', () => {
    const request = vi.fn(async () => new Response(null, { status: 204 }));
    const deferSend = vi.fn(() => false);
    render(
      <ChatConversation
        thread={first}
        activeRun={{ dataUpdatedAt: 0, isFetching: true }}
        config={chatConfig({ send: request, follow: vi.fn() })}
        composer={{ clearOnSend: true }}
        adapters={{ deferSend }}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
      target: { value: 'Keep this draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByDisplayValue('Keep this draft')).toBeTruthy();
    expect(deferSend).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('does not render an empty actions row for tool-only runs', () => {
    const toolOnly = event(first.id, 'a1', [
      { type: 'tool_use', id: 'call', name: 'read_context', params: {} },
    ]).message;
    render(
      <ChatConversation
        thread={{ ...first, messages: [toolOnly] }}
        config={chatConfig({ send: vi.fn() })}
        slots={{ assistantActions: () => null }}
      />,
    );

    expect(
      screen.getByTestId('assistant-message').nextElementSibling,
    ).toBeNull();
  });

  it('does not rerender existing user messages during active-run polling', () => {
    const renderUser = vi.fn(() => null);
    const thread = {
      ...first,
      messages: [
        userMessage('u1', [
          { type: 'text', text: 'First' },
          { type: 'image', index: 0, altText: 'Plan' },
        ]),
      ],
    };
    const config = chatConfig({ send: vi.fn() });
    const conversation = (isFetching: boolean) => (
      <ChatConversation
        thread={thread}
        config={config}
        slots={{ messageImage: renderUser }}
        activeRun={{ dataUpdatedAt: 1, isFetching }}
      />
    );
    const { rerender } = render(conversation(false));

    expect(renderUser).toHaveBeenCalledOnce();

    rerender(conversation(true));

    expect(renderUser).toHaveBeenCalledOnce();
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
    const renders = new Map<string, number>();
    const assistantActions: NonNullable<
      NonNullable<ChatConversationProps['slots']>['assistantActions']
    > = (unit) => {
      renders.set(unit.key, (renders.get(unit.key) ?? 0) + 1);
      return null;
    };
    const onMessageCopied = vi.fn();
    const config = chatConfig(
      { send: request },
      { events: { onNewChat: vi.fn(), onMessageCopied } },
    );
    const conversation = (dataUpdatedAt: number, isFetching: boolean) => (
      <ChatConversation
        thread={thread}
        config={config}
        slots={{ assistantActions }}
        activeRun={{
          dataUpdatedAt,
          isFetching,
        }}
      />
    );
    const { rerender } = render(conversation(0, false));

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
    rerender(conversation(1, true));
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

  it('keeps the sent text visible until the batched user message reaches the timeline', async () => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    });
    const pending = stream();
    try {
      const request = vi.fn(async () => pending.response);
      render(<TestHost config={chatConfig({ send: request })} />);
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
      <ChatConversation
        thread={first}
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

  it('owns the first-message handoff and reports its pending state to the host', async () => {
    const pending = stream();
    const request = vi.fn(async () => pending.response);
    const lifecycle = createChatRunLifecycle({ send: request });
    const onStartedRun = vi.fn();
    lifecycle.startThreadRun({
      threadId: first.id,
      text: 'Started before navigation',
      images: [],
      messageCountBeforeSend: 0,
    });

    render(
      <ChatConversation
        lifecycle={lifecycle}
        thread={first}
        config={chatConfig({ send: request })}
        adapters={{ onStartedRun }}
      />,
    );
    await act(async () => {
      pending.push(answer(first.id, 'a1', 'Handoff complete'));
      pending.close();
    });

    expect(await screen.findByText('Handoff complete')).toBeTruthy();
    expect(request).toHaveBeenCalledOnce();
    expect(onStartedRun).toHaveBeenCalledExactlyOnceWith(
      first.id,
      expect.objectContaining({
        text: 'Started before navigation',
        messageCountBeforeSend: 0,
      }),
      false,
    );
  });

  it('places host context directly before the first user turn', () => {
    const persisted = {
      ...first,
      messages: [
        event(first.id, 'a1', [{ type: 'text', text: 'Earlier answer' }])
          .message,
        userMessage('u1', [{ type: 'text', text: 'First question' }]),
      ],
    };
    const { container, rerender } = render(
      <ChatConversation
        thread={persisted}
        config={chatConfig({ send: vi.fn() })}
        slots={{ contextHint: <div data-testid="context-hint" /> }}
      />,
    );
    const hint = screen.getByTestId('context-hint');
    const message = screen.getByTestId('user-message');
    expect(
      hint.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    rerender(
      <ChatConversation
        thread={first}
        pendingSubmission="Pending question"
        config={chatConfig({ send: vi.fn() })}
        slots={{ contextHint: <div data-testid="context-hint" /> }}
      />,
    );
    expect(
      container.querySelector('[data-testid="context-hint"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="pending-user-message"]'),
    ).toBeTruthy();
  });

  it('hides host context until a user turn exists', () => {
    render(
      <ChatConversation
        thread={first}
        config={chatConfig({ send: vi.fn() })}
        slots={{ contextHint: <div data-testid="context-hint" /> }}
      />,
    );
    expect(screen.queryByTestId('context-hint')).toBeNull();
  });

  it('renders a routine nudge as a notice instead of a user bubble', () => {
    render(
      <ChatConversation
        thread={{
          ...first,
          messages: [
            userMessage('nudge', [
              { type: 'text', text: 'Check in later', isNudge: true },
            ]),
          ],
        }}
        config={chatConfig({ send: vi.fn() })}
        slots={{ messageNudge: (text) => <NudgeNotice text={text} /> }}
      />,
    );
    expect(screen.getByTestId('routine-nudge').textContent).toBe(
      'Check in later',
    );
    expect(screen.queryByTestId('user-message')).toBeNull();
  });

  it('keeps the shared default nudge presentation unchanged without a host slot', () => {
    render(
      <ChatConversation
        thread={{
          ...first,
          messages: [
            userMessage('nudge', [
              { type: 'text', text: 'Plain surface nudge', isNudge: true },
            ]),
          ],
        }}
        config={chatConfig({ send: vi.fn() })}
      />,
    );
    expect(screen.getByText('Plain surface nudge')).toBeTruthy();
    expect(screen.queryByTestId('routine-nudge')).toBeNull();
  });

  it('copies the resolved user prompt and reports the host action', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write: vi.fn(), writeText },
    });
    const onMessageCopied = vi.fn();
    render(
      <ChatConversation
        thread={{
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
        }}
        config={chatConfig(
          { send: vi.fn() },
          { events: { onNewChat: vi.fn(), onMessageCopied } },
        )}
      />,
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
    render(
      <ChatConversation
        thread={{
          ...first,
          messages: [
            answer(first.id, 'a1', '```js\nconst permit = 1;\n```').message,
          ],
        }}
        config={chatConfig(
          { send: vi.fn() },
          { events: { onNewChat: vi.fn(), onCodeCopied } },
        )}
      />,
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
    const { unmount } = render(
      <ChatConversation
        thread={{ ...first, permittedModelId: visionModel.id }}
        config={chatConfig({ send: request })}
        composer={{ clearOnSend: true }}
      />,
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
      <ChatConversation thread={first} config={config('first-user')} />,
    );
    send('Old session prompt');
    const signal = request.mock.calls[0][1];
    await act(async () => {
      rerender(
        <ChatConversation thread={first} config={config('second-user')} />,
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
        thread={first}
        activeRun={{
          run: { cancellable: true },
          dataUpdatedAt: Date.now(),
          isFetching: false,
        }}
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

  it('stops a deferred send that becomes active before cancellation', () => {
    const cancel = vi.fn(async () => undefined);
    const follow = vi.fn(() => new Promise<Response>(() => undefined));
    const request = vi.fn(async () => new Response(null, { status: 204 }));
    const lifecycle = createChatRunLifecycle({ send: request, cancel });
    const controller = new AbortController();
    const cancelDeferredSend = vi.fn(() => {
      lifecycle.registerActiveThreadRun(first.id, controller);
      return false;
    });
    render(
      <ChatConversation
        lifecycle={lifecycle}
        thread={first}
        pendingSubmission="Question"
        activeRun={{
          run: { cancellable: false },
          dataUpdatedAt: Date.now(),
          isFetching: false,
        }}
        config={chatConfig({ send: request, follow, cancel })}
        composer={{ deferredSendCancellable: true }}
        adapters={{ cancelDeferredSend }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

    expect(cancelDeferredSend).toHaveBeenCalledWith(first.id);
    expect(cancel).toHaveBeenCalledWith(first.id);
    expect(controller.signal.aborted).toBe(true);
  });

  it('removes an unsaved streaming tool call when the shared runtime stops', async () => {
    const pending = stream();
    const request = vi.fn(async () => pending.response);
    const cancel = vi.fn(async () => undefined);
    const onThreadState = vi.fn();
    render(
      <ChatConversation
        thread={first}
        config={chatConfig({ send: request, cancel })}
        adapters={{ onThreadState }}
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
      <ChatConversation
        thread={first}
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
        expect(props.config.events.onRunSettled).toHaveBeenCalledTimes(2),
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
            thread={saved}
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
      const requests = serveChatApi({
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

  it('reports a failed send to the run handler instead of the generic error event', async () => {
    const onError = vi.fn();
    const sendError = vi.fn();
    const request = vi.fn(async () => {
      throw new Error('Offline');
    });
    render(
      <ChatConversation
        thread={first}
        config={chatConfig(
          { send: request },
          { events: { onNewChat: vi.fn(), onError } },
        )}
        adapters={{ onRunTransportError: sendError }}
      />,
    );

    send('Try to send');

    await waitFor(() => expect(sendError).toHaveBeenCalledOnce());
    expect(onError).not.toHaveBeenCalled();
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
    const { unmount } = render(
      <ChatConversation
        thread={{ ...first, permittedModelId: visionModel.id }}
        config={chatConfig({ send })}
      />,
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
    'shows an uploaded source once and holds sending while it processes when the thread refresh %s',
    async (_state, refreshThread) => {
      serveChatApi({
        'GET /models/embedding/enabled': { isEmbeddingModelEnabled: true },
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
      function CachedThreadHost() {
        const { data } = useQuery({
          queryKey: getThreadsControllerFindOneQueryKey(first.id),
          queryFn: refreshThread,
          initialData: {
            ...first,
            sources: [],
          } as unknown as GetThreadResponseDto,
          staleTime: Infinity,
        });
        return (
          <ChatConversation
            thread={data}
            config={chatConfig({ send: vi.fn() })}
          />
        );
      }
      vi.stubGlobal(
        'ResizeObserver',
        class {
          observe() {}
          unobserve() {}
          disconnect() {}
        },
      );
      render(<CachedThreadHost />);
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
      expect(screen.getByTestId<HTMLButtonElement>('send').disabled).toBe(true);
      vi.unstubAllGlobals();
    },
  );

  it('does not upload a document dropped while a reply streams', async () => {
    const pending = stream();
    const requests = serveChatApi({
      'GET /models/embedding/enabled': { isEmbeddingModelEnabled: true },
    });
    render(
      <ChatConversation
        thread={first}
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
