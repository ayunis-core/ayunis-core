import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { abortActiveThreadRun } from '@/features/thread-run';
import { useMessageSend } from './useMessageSend';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));

const threadId = '00000000-0000-0000-0000-000000000001';

describe('useMessageSend', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    abortActiveThreadRun(threadId);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('registers the streamed request for thread-level cancellation', async () => {
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useMessageSend({ threadId }), {
      wrapper,
    });

    let sendPromise: Promise<void> | undefined;
    act(() => {
      sendPromise = result.current.sendTextMessage({ text: 'Bitte antworte.' });
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    act(() => abortActiveThreadRun(threadId));
    await act(async () => await sendPromise);

    const request = fetchMock.mock.calls[0]?.[1];
    expect(request?.signal?.aborted).toBe(true);
  });

  it('aborts the original request after the hook switches threads', async () => {
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(
      ({ currentThreadId }) => useMessageSend({ threadId: currentThreadId }),
      { initialProps: { currentThreadId: threadId }, wrapper },
    );

    let sendPromise: Promise<void> | undefined;
    act(() => {
      sendPromise = result.current.sendTextMessage({ text: 'Erster Chat.' });
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    rerender({ currentThreadId: '00000000-0000-0000-0000-000000000002' });
    act(() => result.current.abort());
    await act(async () => await sendPromise);

    const request = fetchMock.mock.calls[0]?.[1];
    expect(request?.signal?.aborted).toBe(true);
  });
});
