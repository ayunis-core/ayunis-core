import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  abortActiveThreadRun,
  cancelDeferredThreadRun,
  deferThreadRun,
  getPendingThreadSubmission,
  resetThreadSubmission,
  subscribeToThreadSubmissions,
  takeStartedThreadRun,
} from '@/features/thread-run';
import { useChatThread } from '@/pages/chat/api/useChatThread';
import type { Thread } from '@/pages/chat/model/openapi';
import { usePendingMessage } from './usePendingMessage';

const { findThread } = vi.hoisted(() => ({ findThread: vi.fn() }));

vi.mock('@ayunis/api-client/endpoints', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  threadsControllerFindOne: findThread,
}));

const threadId = '00000000-0000-0000-0000-000000000001';
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
  const resumeStartedRun = vi.fn(() => Boolean(takeStartedThreadRun(threadId)));
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
        hasProcessingSources,
        resumeStartedRun,
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
  return { resumeStartedRun, ...view };
}

function sentTexts(): unknown[] {
  return vi
    .mocked(fetch)
    .mock.calls.map(([, init]) => (init?.body as FormData).get('text'));
}

describe('first message of a new chat started with a file', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')));
    findThread.mockResolvedValue(threadWithSource('processing'));
    deferThreadRun({ threadId, text: message, images: [], skillId: 'skill-1' });
  });

  afterEach(() => {
    act(() => {
      cancelDeferredThreadRun(threadId);
      takeStartedThreadRun(threadId);
      abortActiveThreadRun(threadId);
      resetThreadSubmission(threadId);
    });
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('shows the message as pending and holds it while the file is processing', async () => {
    const { resumeStartedRun } = renderChat();

    await act(() => vi.advanceTimersByTimeAsync(FOUR_MINUTES_MS));

    expect(getPendingThreadSubmission(threadId)).toBe(message);
    expect(resumeStartedRun).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not restart pending state when the resume callback changes', () => {
    const submissionListener = vi.fn();
    const unsubscribe = subscribeToThreadSubmissions(submissionListener);
    const { rerender } = renderHook(
      ({ resumeStartedRun }: { resumeStartedRun: () => boolean }) =>
        usePendingMessage({
          threadId,
          hasProcessingSources: true,
          resumeStartedRun,
        }),
      { initialProps: { resumeStartedRun: vi.fn(() => false) } },
    );

    expect(submissionListener).toHaveBeenCalledOnce();
    rerender({ resumeStartedRun: vi.fn(() => false) });
    expect(submissionListener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('hands the run to the shared runtime when the file becomes ready', async () => {
    const { resumeStartedRun, result } = renderChat();
    await act(() => vi.advanceTimersByTimeAsync(FOUR_MINUTES_MS));

    findThread.mockResolvedValue(threadWithSource('ready'));
    await act(() => vi.advanceTimersByTimeAsync(TWO_POLLS_MS));

    expect(result.current.sources[0].status).toBe('ready');
    expect(sentTexts()).toEqual([message]);
    expect(resumeStartedRun).toHaveBeenCalledOnce();
  });

  it('hands the run over when processing ends in failure', async () => {
    const { resumeStartedRun, result } = renderChat();
    await act(() => vi.advanceTimersByTimeAsync(FOUR_MINUTES_MS));

    findThread.mockResolvedValue(threadWithSource('failed'));
    await act(() => vi.advanceTimersByTimeAsync(TWO_POLLS_MS));

    expect(result.current.sources[0].status).toBe('failed');
    expect(sentTexts()).toEqual([message]);
    expect(resumeStartedRun).toHaveBeenCalledOnce();
  });

  it('hands the run over at once when the file is already processed', async () => {
    findThread.mockResolvedValue(threadWithSource('ready'));
    const { resumeStartedRun } = renderChat();

    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(sentTexts()).toEqual([message]);
    expect(resumeStartedRun).toHaveBeenCalledOnce();
  });

  it('sends nothing after the waiting message was cancelled', async () => {
    const { resumeStartedRun } = renderChat();
    await act(() => vi.advanceTimersByTimeAsync(TWO_POLLS_MS));

    act(() => cancelDeferredThreadRun(threadId));
    findThread.mockResolvedValue(threadWithSource('ready'));
    await act(() => vi.advanceTimersByTimeAsync(TWO_POLLS_MS));

    expect(resumeStartedRun).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
