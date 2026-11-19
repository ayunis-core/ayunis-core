import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  abortActiveThreadRun,
  isThreadRunActive,
  startThreadRun,
  useIsThreadRunActive,
} from '@/features/thread-run';
import { rememberChatItem } from '@/features/outlook-tools';
import { getActiveRunsControllerFindActiveQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import { usePendingMessage } from '@/pages/chat/hooks/usePendingMessage';
import { EmbeddedContext } from '@/shared/contexts/embedded/embeddedContext';
import type { Message } from '@/pages/chat/model/openapi';
import { useMessageSendWithOutlookTools } from './useMessageSendWithOutlookTools';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const request = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));

const threadId = '00000000-0000-0000-0000-000000000001';
const otherThreadId = '00000000-0000-0000-0000-000000000002';

const readEmailCall = {
  id: 'assistant-1',
  threadId,
  role: 'assistant',
  createdAt: '2026-11-18T09:00:01.000Z',
  content: [
    { type: 'text', text: 'Let me read it.' },
    { type: 'tool_use', id: 'call-1', name: 'outlook__read_email', params: {} },
  ],
};

const summary = {
  id: 'assistant-2',
  threadId,
  role: 'assistant',
  createdAt: '2026-11-18T09:00:02.000Z',
  content: [{ type: 'text', text: 'Alice asks about the budget.' }],
};

function sse(...messages: object[]): Response {
  const body = messages
    .map((message) => `data: ${JSON.stringify({ type: 'message', message })}\n`)
    .join('');
  return new Response(body, { status: 200 });
}

function stubOutlookReadView(itemId = 'mail-1') {
  vi.stubGlobal('Office', {
    AsyncResultStatus: { Succeeded: 'succeeded', Failed: 'failed' },
    CoercionType: { Text: 'text', Html: 'html' },
    context: {
      requirements: { isSetSupported: () => true },
      mailbox: {
        item: {
          itemId,
          subject: 'Budget',
          attachments: [],
          body: {
            getAsync: (_coercion: string, callback: (r: object) => void) =>
              callback({ status: 'succeeded', value: 'Hello Bob' }),
          },
          displayReplyForm: vi.fn(),
        },
      },
    },
  });
}

/** The chat page's wiring: streamed messages feed back into the hook. */
function useChat(initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const isStreaming = useIsThreadRunActive(threadId);
  const send = useMessageSendWithOutlookTools({
    threadId,
    messages,
    isStreaming,
    piiMasks: [],
    onMessageEvent: ({ message }) =>
      setMessages((current) => [
        ...current.filter(({ id }) => id !== message.id),
        message,
      ]),
  });
  // A new chat's first message, sent by the new-chat page before this page.
  usePendingMessage({
    threadId,
    hasLoadedMessages: initialMessages.length > 0,
    hasProcessingSources: false,
    sendTextMessage: send.sendTextMessage,
  });
  return { send, messages };
}

function chatWrapper(embedded: boolean, queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <EmbeddedContext.Provider value={embedded}>
          {children}
        </EmbeddedContext.Provider>
      </QueryClientProvider>
    );
  };
}

function renderChat(
  embedded: boolean,
  initialMessages: Message[] = [],
  queryClient = new QueryClient(),
) {
  // The app renders in StrictMode, which runs every effect twice in development.
  return renderHook(() => useChat(initialMessages), {
    wrapper: chatWrapper(embedded, queryClient),
    reactStrictMode: true,
  });
}

function sentForm(fetchMock: ReturnType<typeof vi.fn>, call: number) {
  const [, init] = fetchMock.mock.calls[call] as [string, RequestInit];
  return init.body as FormData;
}

afterEach(() => {
  abortActiveThreadRun(threadId);
  abortActiveThreadRun(otherThreadId);
  rememberChatItem(threadId, null);
  rememberChatItem(otherThreadId, null);
  request.mockReset().mockResolvedValue([]);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe(useMessageSendWithOutlookTools.name, () => {
  it('streams a web run exactly as before: one request, every message delivered, no Outlook tool result sent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sse(readEmailCall));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderChat(false);

    await act(() =>
      result.current.send.sendTextMessage({ text: 'Summarize this email.' }),
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sentForm(fetchMock, 0).get('text')).toBe('Summarize this email.');
    expect(sentForm(fetchMock, 0).has('toolResult')).toBe(false);
    expect(result.current.messages).toEqual([readEmailCall]);
    expect(result.current.send.outlookToolBridge).toBeNull();
  });

  it('continues an Outlook pane run with the email it asked to read', async () => {
    stubOutlookReadView();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(sse(readEmailCall))
      .mockResolvedValueOnce(sse(summary));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderChat(true);

    await act(() =>
      result.current.send.sendTextMessage({ text: 'Summarize this email.' }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const toolResult = JSON.parse(
      sentForm(fetchMock, 1).get('toolResult') as string,
    ) as { toolId: string; result: string };
    expect(toolResult.toolId).toBe('call-1');
    expect(JSON.parse(toolResult.result)).toMatchObject({ subject: 'Budget' });
    await waitFor(() =>
      expect(result.current.messages).toEqual([readEmailCall, summary]),
    );
  });

  it('waits for the existing run’s attach stream before posting a reopened Outlook read', async () => {
    stubOutlookReadView();
    rememberChatItem(threadId, 'read:mail-1');
    const activeRuns = [{ threadId, cancellable: true }];
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      getActiveRunsControllerFindActiveQueryKey(),
      activeRuns,
    );
    request.mockResolvedValue(activeRuns);
    let resolveAttach!: (response: Response) => void;
    const attach = new Promise<Response>((resolve) => {
      resolveAttach = resolve;
    });
    const fetchMock = vi.fn((url: string) =>
      url.endsWith('/events') ? attach : Promise.resolve(sse(summary)),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderChat(
      true,
      [readEmailCall as unknown as Message],
      queryClient,
    );
    await act(() => Promise.resolve());

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/events');

    request.mockResolvedValue([]);
    await act(async () => {
      resolveAttach(sse(readEmailCall));
      await attach;
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sentForm(fetchMock, 1).get('toolResult')).toContain('call-1');
    await waitFor(() =>
      expect(result.current.messages).toEqual([readEmailCall, summary]),
    );
  });

  it('continues the newly opened chat’s read when the previous chat finishes attaching', async () => {
    stubOutlookReadView();
    rememberChatItem(otherThreadId, 'read:mail-2');
    const queryClient = new QueryClient();
    const activeRuns = [{ threadId, cancellable: true }];
    queryClient.setQueryData(
      getActiveRunsControllerFindActiveQueryKey(),
      activeRuns,
    );
    let resolveRuns!: (runs: typeof activeRuns) => void;
    const runs = new Promise<typeof activeRuns>((resolve) => {
      resolveRuns = resolve;
    });
    request.mockReturnValue(runs);
    let resolveAttach!: (response: Response) => void;
    const attach = new Promise<Response>((resolve) => {
      resolveAttach = resolve;
    });
    const fetchMock = vi.fn((url: string) =>
      url.endsWith('/events') ? attach : Promise.resolve(sse()),
    );
    vi.stubGlobal('fetch', fetchMock);

    const initialProps: { threadId: string; messages: Message[] } = {
      threadId,
      messages: [],
    };
    const { rerender } = renderHook(
      ({ threadId, messages }) =>
        useMessageSendWithOutlookTools({
          threadId,
          messages,
          isStreaming: useIsThreadRunActive(threadId),
          piiMasks: [],
        }),
      {
        initialProps,
        wrapper: chatWrapper(true, queryClient),
        reactStrictMode: true,
      },
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      `/threads/${threadId}/events`,
    );

    stubOutlookReadView('mail-2');
    rerender({
      threadId: otherThreadId,
      messages: [
        { ...readEmailCall, threadId: otherThreadId } as unknown as Message,
      ],
    });
    await act(async () => {
      resolveAttach(new Response(null, { status: 204 }));
      await attach;
    });
    expect(isThreadRunActive(threadId)).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();

    await act(async () => {
      resolveRuns([]);
      await runs;
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const form = sentForm(fetchMock, 1);
    expect(form.get('threadId')).toBe(otherThreadId);
    expect(form.get('toolResult')).toContain('call-1');
  });

  it('posts a reopened read after the attach request fails', async () => {
    stubOutlookReadView();
    rememberChatItem(threadId, 'read:mail-1');
    const queryClient = new QueryClient();
    const activeRuns = [{ threadId, cancellable: true }];
    queryClient.setQueryData(
      getActiveRunsControllerFindActiveQueryKey(),
      activeRuns,
    );
    request.mockResolvedValue(activeRuns);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn((url: string) =>
      url.endsWith('/events')
        ? Promise.reject(new Error('Attach connection failed'))
        : Promise.resolve(sse(summary)),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderChat(
      true,
      [readEmailCall as unknown as Message],
      queryClient,
    );

    await waitFor(() =>
      expect(result.current.messages).toEqual([readEmailCall, summary]),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/events');
    expect(sentForm(fetchMock, 1).get('toolResult')).toContain('call-1');
  });

  it('continues a reopened Outlook read once when there is no run to attach to', async () => {
    stubOutlookReadView();
    rememberChatItem(threadId, 'read:mail-1');
    const queryClient = new QueryClient();
    queryClient.setQueryData(getActiveRunsControllerFindActiveQueryKey(), []);
    const fetchMock = vi.fn().mockResolvedValue(sse(summary));
    vi.stubGlobal('fetch', fetchMock);

    renderChat(true, [readEmailCall as unknown as Message], queryClient);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(sentForm(fetchMock, 0).get('toolResult')).toContain('call-1');
  });

  it("answers a new chat's first read call even when the thread was loaded after the run saved it", async () => {
    stubOutlookReadView();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(sse(readEmailCall))
      .mockResolvedValueOnce(sse(summary));
    vi.stubGlobal('fetch', fetchMock);
    startThreadRun({ threadId, text: 'Summarize this email.', images: [] });

    renderChat(true, [readEmailCall as unknown as Message]);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const toolResult = JSON.parse(
      sentForm(fetchMock, 1).get('toolResult') as string,
    ) as { toolId: string };
    expect(toolResult.toolId).toBe('call-1');
  });
});
