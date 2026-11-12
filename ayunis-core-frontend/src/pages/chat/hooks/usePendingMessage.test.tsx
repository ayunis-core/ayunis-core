import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  abortActiveThreadRun,
  cancelDeferredThreadRun,
  deferThreadRun,
  startThreadRun,
  takeStartedThreadRun,
} from '@/features/thread-run';
import { useChatThread } from '@/pages/chat/api/useChatThread';
import type { Thread } from '@/pages/chat/model/openapi';
import {
  completeThreadSubmission,
  getFailedThreadSubmission,
  getPendingThreadSubmission,
  resetThreadSubmission,
} from '@/pages/chat/model/pending-submissions';
import { usePendingMessage } from './usePendingMessage';

const { findThread } = vi.hoisted(() => ({ findThread: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  threadsControllerFindOne: findThread,
}));

const threadId = '00000000-0000-0000-0000-000000000001';

function renderPendingMessage(options?: {
  hasLoadedMessages?: boolean;
  strict?: boolean;
}) {
  const sendTextMessage = vi.fn().mockResolvedValue(undefined);
  renderHook(
    () =>
      usePendingMessage({
        threadId,
        hasLoadedMessages: options?.hasLoadedMessages ?? false,
        hasProcessingSources: false,
        sendTextMessage,
      }),
    options?.strict ? { wrapper: StrictMode } : undefined,
  );
  return { sendTextMessage };
}

describe(usePendingMessage.name, () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')));
  });

  afterEach(() => {
    takeStartedThreadRun(threadId);
    abortActiveThreadRun(threadId);
    resetThreadSubmission(threadId);
    vi.unstubAllGlobals();
  });

  it('reads the response of the already started first message', async () => {
    const file = new File(['png'], 'screenshot.png', { type: 'image/png' });
    startThreadRun({ threadId, text: '', images: [{ file }] });

    const { sendTextMessage } = renderPendingMessage();

    await waitFor(() => expect(sendTextMessage).toHaveBeenCalledTimes(1));
    const [input] = sendTextMessage.mock.calls[0] as [
      { text: string; startedRequest?: unknown },
    ];
    expect(input.text).toBe('');
    expect(input.startedRequest).toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('passes on that the started first message was dictated', async () => {
    startThreadRun({ threadId, text: 'Hallo', images: [], voiceInput: true });

    const { sendTextMessage } = renderPendingMessage();

    await waitFor(() =>
      expect(sendTextMessage).toHaveBeenCalledWith(
        expect.objectContaining({ voiceInput: true }),
      ),
    );
  });

  it('shows the started message as pending until the thread has it', () => {
    startThreadRun({ threadId, text: 'Hallo', images: [] });

    renderPendingMessage({ hasLoadedMessages: false });

    expect(getPendingThreadSubmission(threadId)).toBe('Hallo');
  });

  it('does not show a pending copy of a message the thread already loaded', () => {
    startThreadRun({ threadId, text: 'Hallo', images: [] });

    renderPendingMessage({ hasLoadedMessages: true });

    expect(getPendingThreadSubmission(threadId)).toBeNull();
    completeThreadSubmission(threadId, true);
    expect(getFailedThreadSubmission(threadId)).toMatchObject({
      text: 'Hallo',
    });
  });

  it('takes the started message only once under StrictMode', async () => {
    startThreadRun({ threadId, text: 'Hallo', images: [] });

    const { sendTextMessage } = renderPendingMessage({ strict: true });

    await waitFor(() => expect(sendTextMessage).toHaveBeenCalled());
    expect(sendTextMessage).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when no message was started for the thread', () => {
    const { sendTextMessage } = renderPendingMessage();

    expect(sendTextMessage).not.toHaveBeenCalled();
    expect(getPendingThreadSubmission(threadId)).toBeNull();
  });
});

describe('first message of a new chat started with a file', () => {
  const FOUR_MINUTES_MS = 240_000;
  const TWO_POLLS_MS = 10_000;
  const message = 'Fasse den Haushalt zusammen';

  function threadWithSource(status: 'processing' | 'ready' | 'failed') {
    return {
      id: threadId,
      messages: [],
      sources: [{ id: 'source-1', name: 'haushalt.pdf', status }],
    } as unknown as Thread;
  }

  function renderChat() {
    const sendTextMessage = vi.fn().mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    const loadedThread = threadWithSource('processing');
    const view = renderHook(
      () => {
        const { thread, hasProcessingSources } = useChatThread(
          loadedThread,
          false,
        );
        usePendingMessage({
          threadId,
          hasLoadedMessages: thread.messages.length > 0,
          hasProcessingSources,
          sendTextMessage,
        });
        return thread;
      },
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      },
    );
    return { sendTextMessage, ...view };
  }

  function sentTexts(): unknown[] {
    return vi
      .mocked(fetch)
      .mock.calls.map(([, init]) => (init?.body as FormData).get('text'));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')));
    findThread.mockResolvedValue(threadWithSource('processing'));
    deferThreadRun({ threadId, text: message, images: [], skillId: 'skill-1' });
  });

  afterEach(() => {
    cancelDeferredThreadRun(threadId);
    takeStartedThreadRun(threadId);
    abortActiveThreadRun(threadId);
    resetThreadSubmission(threadId);
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('shows the message as pending and holds it while the file is processing', async () => {
    const { sendTextMessage } = renderChat();

    await act(() => vi.advanceTimersByTimeAsync(FOUR_MINUTES_MS));

    expect(getPendingThreadSubmission(threadId)).toBe(message);
    expect(sendTextMessage).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends the message once a file that needed more than three minutes is ready', async () => {
    const { sendTextMessage, result } = renderChat();
    await act(() => vi.advanceTimersByTimeAsync(FOUR_MINUTES_MS));

    findThread.mockResolvedValue(threadWithSource('ready'));
    await act(() => vi.advanceTimersByTimeAsync(TWO_POLLS_MS));

    expect(result.current.sources[0].status).toBe('ready');
    expect(sentTexts()).toEqual([message]);
    expect(sendTextMessage).toHaveBeenCalledTimes(1);
    expect(sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: message }),
    );
  });

  it('sends the message when the file ends as failed', async () => {
    const { sendTextMessage, result } = renderChat();
    await act(() => vi.advanceTimersByTimeAsync(FOUR_MINUTES_MS));

    findThread.mockResolvedValue(threadWithSource('failed'));
    await act(() => vi.advanceTimersByTimeAsync(TWO_POLLS_MS));

    expect(result.current.sources[0].status).toBe('failed');
    expect(sentTexts()).toEqual([message]);
    expect(sendTextMessage).toHaveBeenCalledTimes(1);
  });

  it('sends the message at once when the file is already processed on arrival', async () => {
    findThread.mockResolvedValue(threadWithSource('ready'));
    const { sendTextMessage } = renderChat();

    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(sentTexts()).toEqual([message]);
    expect(sendTextMessage).toHaveBeenCalledTimes(1);
  });

  it('sends nothing after the waiting message was cancelled', async () => {
    const { sendTextMessage } = renderChat();
    await act(() => vi.advanceTimersByTimeAsync(TWO_POLLS_MS));

    cancelDeferredThreadRun(threadId);
    findThread.mockResolvedValue(threadWithSource('ready'));
    await act(() => vi.advanceTimersByTimeAsync(TWO_POLLS_MS));

    expect(sendTextMessage).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
