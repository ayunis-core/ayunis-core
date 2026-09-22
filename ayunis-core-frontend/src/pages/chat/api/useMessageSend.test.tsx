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
const otherThreadId = '00000000-0000-0000-0000-000000000002';

function createControlledSseResponse() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(streamController) {
        controller = streamController;
      },
    }),
    { status: 200 },
  );
  return {
    response,
    send: (data: object) =>
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n`),
      ),
    close: () => controller.close(),
  };
}

describe('useMessageSend', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    abortActiveThreadRun(threadId);
    abortActiveThreadRun(otherThreadId);
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

  it('dispatches stream events only while their thread is selected', async () => {
    const stream = createControlledSseResponse();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(stream.response));
    const firstThreadHandler = vi.fn();
    const secondThreadHandler = vi.fn();
    const returnedThreadHandler = vi.fn();
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(
      ({ currentThreadId, onMessageEvent }) =>
        useMessageSend({ threadId: currentThreadId, onMessageEvent }),
      {
        initialProps: {
          currentThreadId: threadId,
          onMessageEvent: firstThreadHandler,
        },
        wrapper,
      },
    );

    let sendPromise: Promise<void> | undefined;
    act(() => {
      sendPromise = result.current.sendTextMessage({ text: 'Erster Chat.' });
    });
    rerender({
      currentThreadId: otherThreadId,
      onMessageEvent: secondThreadHandler,
    });
    await act(async () => {
      stream.send({ type: 'message', message: { id: 'ignored' } });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(firstThreadHandler).not.toHaveBeenCalled();
    expect(secondThreadHandler).not.toHaveBeenCalled();

    rerender({
      currentThreadId: threadId,
      onMessageEvent: returnedThreadHandler,
    });
    act(() => {
      stream.send({ type: 'message', message: { id: 'visible' } });
      stream.close();
    });
    await act(async () => await sendPromise);

    expect(secondThreadHandler).not.toHaveBeenCalled();
    expect(returnedThreadHandler).toHaveBeenCalledWith(
      expect.objectContaining({ message: { id: 'visible' } }),
    );
  });

  it('runs request lifecycle callbacks while another thread is selected', async () => {
    const stream = createControlledSseResponse();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(stream.response));
    const onMessageReceived = vi.fn();
    const onErrorEvent = vi.fn();
    const onComplete = vi.fn();
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(
      ({ currentThreadId }) =>
        useMessageSend({
          threadId: currentThreadId,
          onMessageReceived,
          onErrorEvent,
          onComplete,
        }),
      { initialProps: { currentThreadId: threadId }, wrapper },
    );

    let sendPromise: Promise<void> | undefined;
    act(() => {
      sendPromise = result.current.sendTextMessage({ text: 'Erster Chat.' });
    });
    rerender({ currentThreadId: otherThreadId });
    act(() => {
      stream.send({ type: 'message', message: { id: 'persisted' } });
      stream.send({ type: 'error', code: 'RUN_FAILED' });
      stream.close();
    });
    await act(async () => await sendPromise);

    expect(onMessageReceived).toHaveBeenCalledOnce();
    expect(onErrorEvent).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith(true);
  });

  it('dispatches later events to a remounted hook for the request thread', async () => {
    const stream = createControlledSseResponse();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(stream.response));
    const staleHandler = vi.fn();
    const remountedHandler = vi.fn();
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const firstHook = renderHook(
      () => useMessageSend({ threadId, onMessageEvent: staleHandler }),
      { wrapper },
    );

    let sendPromise: Promise<void> | undefined;
    act(() => {
      sendPromise = firstHook.result.current.sendTextMessage({
        text: 'Erster Chat.',
      });
    });
    firstHook.unmount();
    renderHook(
      () => useMessageSend({ threadId, onMessageEvent: remountedHandler }),
      { wrapper },
    );
    act(() => {
      stream.send({ type: 'message', message: { id: 'visible' } });
      stream.close();
    });
    await act(async () => await sendPromise);

    expect(staleHandler).not.toHaveBeenCalled();
    expect(remountedHandler).toHaveBeenCalledWith(
      expect.objectContaining({ message: { id: 'visible' } }),
    );
  });

  it('keeps concurrent thread request outcomes independent', async () => {
    const firstStream = createControlledSseResponse();
    const secondStream = createControlledSseResponse();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(firstStream.response)
        .mockResolvedValueOnce(secondStream.response),
    );
    const firstComplete = vi.fn();
    const secondComplete = vi.fn();
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(
      ({ currentThreadId, onComplete }) =>
        useMessageSend({ threadId: currentThreadId, onComplete }),
      {
        initialProps: {
          currentThreadId: threadId,
          onComplete: firstComplete,
        },
        wrapper,
      },
    );

    let firstPromise: Promise<void> | undefined;
    act(() => {
      firstPromise = result.current.sendTextMessage({ text: 'Erster Chat.' });
    });
    rerender({
      currentThreadId: otherThreadId,
      onComplete: secondComplete,
    });
    let secondPromise: Promise<void> | undefined;
    act(() => {
      secondPromise = result.current.sendTextMessage({ text: 'Zweiter Chat.' });
    });
    await act(async () => {
      firstStream.send({ type: 'error', code: 'FIRST_RUN_FAILED' });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    rerender({ currentThreadId: threadId, onComplete: firstComplete });
    firstStream.close();
    await act(async () => await firstPromise);
    expect(firstComplete).toHaveBeenCalledWith(true);

    rerender({
      currentThreadId: otherThreadId,
      onComplete: secondComplete,
    });
    secondStream.close();
    await act(async () => await secondPromise);
    expect(secondComplete).toHaveBeenCalledWith(false);
  });

  it('keeps a request active across unmount and lets a remounted hook cancel it', async () => {
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
    const firstHook = renderHook(() => useMessageSend({ threadId }), {
      wrapper,
    });

    let sendPromise: Promise<void> | undefined;
    act(() => {
      sendPromise = firstHook.result.current.sendTextMessage({
        text: 'Erster Chat.',
      });
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    firstHook.unmount();
    const request = fetchMock.mock.calls[0]?.[1];
    expect(request?.signal?.aborted).toBe(false);

    const remountedHook = renderHook(() => useMessageSend({ threadId }), {
      wrapper,
    });
    act(() => remountedHook.result.current.abort());
    await act(async () => await sendPromise);

    expect(request?.signal?.aborted).toBe(true);
  });
});
