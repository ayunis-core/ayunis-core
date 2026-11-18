import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  abortActiveThreadRun,
  startThreadRun,
  useIsThreadRunActive,
} from '@/features/thread-run';
import { usePendingMessage } from '@/pages/chat/hooks/usePendingMessage';
import { EmbeddedContext } from '@/shared/contexts/embedded/embeddedContext';
import type { Message } from '@/pages/chat/model/openapi';
import { useMessageSendWithOutlookTools } from './useMessageSendWithOutlookTools';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const threadId = '00000000-0000-0000-0000-000000000001';

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

function stubOutlookReadView() {
  vi.stubGlobal('Office', {
    AsyncResultStatus: { Succeeded: 'succeeded', Failed: 'failed' },
    CoercionType: { Text: 'text', Html: 'html' },
    context: {
      requirements: { isSetSupported: () => true },
      mailbox: {
        item: {
          itemId: 'mail-1',
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

function renderChat(embedded: boolean, initialMessages: Message[] = []) {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <EmbeddedContext.Provider value={embedded}>
        {children}
      </EmbeddedContext.Provider>
    </QueryClientProvider>
  );
  // The app renders in StrictMode, which runs every effect twice in development.
  return renderHook(() => useChat(initialMessages), {
    wrapper,
    reactStrictMode: true,
  });
}

function sentForm(fetchMock: ReturnType<typeof vi.fn>, call: number) {
  const [, init] = fetchMock.mock.calls[call] as [string, RequestInit];
  return init.body as FormData;
}

afterEach(() => {
  abortActiveThreadRun(threadId);
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
