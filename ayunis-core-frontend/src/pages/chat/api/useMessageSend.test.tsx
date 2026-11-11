import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { abortActiveThreadRun } from '@/features/thread-run';
import { showError } from '@/shared/lib/toast';
import type * as GeneratedApi from '@/shared/api/generated/ayunisCoreAPI';
import { useMessageSend } from './useMessageSend';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));

const { cancelRun } = vi.hoisted(() => ({
  cancelRun: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', async (importOriginal) => ({
  ...(await importOriginal<typeof GeneratedApi>()),
  activeRunsControllerCancel: cancelRun,
}));

const { redirectToLogin } = vi.hoisted(() => ({
  redirectToLogin: vi.fn(),
}));
vi.mock('@/shared/lib/redirect-to-login', () => ({ redirectToLogin }));

const openPanel = vi.hoisted(() => ({
  client: null as { track: ReturnType<typeof vi.fn> } | null,
}));
vi.mock('@/shared/lib/openpanel', () => ({
  get openPanel() {
    return openPanel.client;
  },
}));

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
    fail: (reason: unknown) => controller.error(reason),
  };
}

describe('useMessageSend', () => {
  beforeEach(() => {
    redirectToLogin.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    abortActiveThreadRun(threadId);
    abortActiveThreadRun(otherThreadId);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redirects to login when the session can no longer be renewed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
        }),
      ),
    );
    const onError = vi.fn();
    const onComplete = vi.fn();
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useMessageSend({ threadId, onError, onComplete }),
      { wrapper },
    );

    await act(async () => {
      await result.current.sendTextMessage({ text: 'Bitte antworte.' });
    });

    expect(redirectToLogin).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(true);
  });

  it('asks the user to retry when the image upload cap is reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'IMAGE_UPLOADS_BUSY',
            message: 'Too many image uploads are being processed',
          }),
          { status: 429 },
        ),
      ),
    );
    const onError = vi.fn();
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useMessageSend({ threadId, onError }), {
      wrapper,
    });

    await act(async () => {
      await result.current.sendTextMessage({
        text: 'Was steht auf dem Schild?',
        images: [
          {
            file: new File(['photo'], 'schild.jpg', { type: 'image/jpeg' }),
            altText: 'schild.jpg',
          },
        ],
      });
    });

    expect(showError).toHaveBeenCalledWith('chat.imageUploadsBusy');
    expect(onError).not.toHaveBeenCalled();
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

  it('delivers the latest state that streamed while the chat was closed once it is reopened', async () => {
    const stream = createControlledSseResponse();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(stream.response));
    const reopenedMessages = vi.fn();
    const reopenedMasks = vi.fn();
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
        text: 'Was gilt für Hunde?',
      });
    });
    firstHook.unmount();
    await act(async () => {
      stream.send({ type: 'masks', masks: [{ id: 'mask-1' }] });
      stream.send({ type: 'message', message: { id: 'answer', text: 'Laut' } });
      stream.send({
        type: 'message',
        message: { id: 'answer', text: 'Laut Satzung' },
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    renderHook(
      () =>
        useMessageSend({
          threadId,
          onMessageEvent: reopenedMessages,
          onMasksEvent: reopenedMasks,
        }),
      { wrapper },
    );

    expect(reopenedMasks).toHaveBeenCalledWith(
      expect.objectContaining({ masks: [{ id: 'mask-1' }] }),
    );
    expect(reopenedMessages).toHaveBeenCalledOnce();
    expect(reopenedMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        message: { id: 'answer', text: 'Laut Satzung' },
      }),
    );
    act(() => stream.close());
    await act(async () => await sendPromise);
  });

  it('does not report a failed attach as a message that could not be sent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('boom', { status: 500 })),
    );
    const onError = vi.fn();
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useMessageSend({ threadId, onError }), {
      wrapper,
    });

    let attachError: unknown;
    await act(async () => {
      await result.current.attach().catch((error: unknown) => {
        attachError = error;
      });
    });

    expect(attachError).toBeInstanceOf(Error);
    expect(onError).not.toHaveBeenCalled();
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

  it('cancels the run on the server when stopped, since it outlives the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted', 'AbortError'),
              );
            });
          }),
      ),
    );
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useMessageSend({ threadId }), {
      wrapper,
    });
    let sendPromise: Promise<void> | undefined;
    act(() => {
      sendPromise = result.current.sendTextMessage({ text: 'Lange Aufgabe' });
    });

    act(() => result.current.abort());
    await act(async () => await sendPromise);

    expect(cancelRun).toHaveBeenCalledWith(threadId);
  });

  it('attaches to the run in progress on the thread and streams it', async () => {
    const stream = createControlledSseResponse();
    const fetchMock = vi.fn().mockResolvedValue(stream.response);
    vi.stubGlobal('fetch', fetchMock);
    const onSessionEvent = vi.fn();
    const onComplete = vi.fn();
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useMessageSend({ threadId, onSessionEvent, onComplete }),
      { wrapper },
    );

    let attachPromise: Promise<void> | undefined;
    act(() => {
      attachPromise = result.current.attach();
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await act(async () => {
      stream.send({ type: 'session', streaming: true, threadId });
      stream.close();
      await attachPromise;
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/runs/threads/${threadId}/events$`));
    expect(init.method).toBe('GET');
    expect(onSessionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'session', streaming: true }),
    );
    expect(onComplete).toHaveBeenCalledWith(false);
  });

  it('finishes quietly when the thread has no run left to attach to', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    const onError = vi.fn();
    const onComplete = vi.fn();
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useMessageSend({ threadId, onError, onComplete }),
      { wrapper },
    );

    await act(async () => {
      await result.current.attach();
    });

    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(false);
  });

  describe('message batching', () => {
    beforeEach(() => {
      vi.useFakeTimers({
        toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function renderStreamingHook(
      params: Omit<Parameters<typeof useMessageSend>[0], 'threadId'>,
      { startedBeforeMount = false } = {},
    ) {
      const stream = createControlledSseResponse();
      const fetchMock = vi.fn().mockResolvedValue(stream.response);
      vi.stubGlobal('fetch', fetchMock);
      const startedRequest = startedBeforeMount
        ? {
            controller: new AbortController(),
            response: Promise.resolve(stream.response),
          }
        : undefined;
      const queryClient = new QueryClient();
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
      const { result } = renderHook(
        () => useMessageSend({ threadId, ...params }),
        { wrapper },
      );
      let sendPromise: Promise<void> | undefined;
      act(() => {
        sendPromise = result.current.sendTextMessage({
          text: 'Frage',
          startedRequest,
        });
      });
      const sendAndRead = async (...events: object[]) => {
        await act(async () => {
          events.forEach((event) => stream.send(event));
          await new Promise((resolve) => setTimeout(resolve, 0));
        });
      };
      const finish = async () => {
        stream.close();
        await act(async () => await sendPromise);
      };
      return { result, sendAndRead, finish, fetchMock };
    }

    it('applies streamed messages once per animation frame, keeping the latest per message', async () => {
      const onMessageEvent = vi.fn();
      const { sendAndRead, finish } = renderStreamingHook({ onMessageEvent });

      await sendAndRead(
        { type: 'message', message: { id: 'answer', text: 'H' } },
        { type: 'message', message: { id: 'tool', text: 'Suche' } },
        { type: 'message', message: { id: 'answer', text: 'Hallo' } },
      );
      expect(onMessageEvent).not.toHaveBeenCalled();

      act(() => vi.advanceTimersToNextFrame());

      expect(onMessageEvent.mock.calls.map(([event]) => event)).toEqual([
        { type: 'message', message: { id: 'answer', text: 'Hallo' } },
        { type: 'message', message: { id: 'tool', text: 'Suche' } },
      ]);
      await finish();
    });

    it('applies pending messages before other events and before completing', async () => {
      const calls: string[] = [];
      const { sendAndRead, finish } = renderStreamingHook({
        onMessageEvent: (event) => calls.push(`message:${event.message.id}`),
        onThreadEvent: () => calls.push('thread'),
        onErrorEvent: () => calls.push('error'),
        onComplete: () => calls.push('complete'),
      });

      await sendAndRead(
        { type: 'message', message: { id: 'first' } },
        { type: 'thread', title: 'Titel' },
        { type: 'message', message: { id: 'partial' } },
        { type: 'error', code: 'RUN_FAILED' },
        { type: 'message', message: { id: 'final' } },
      );
      await finish();

      expect(calls).toEqual([
        'message:first',
        'thread',
        'message:partial',
        'error',
        'message:final',
        'complete',
      ]);
    });

    it('applies pending messages as soon as the run is cancelled', async () => {
      const onMessageEvent = vi.fn();
      const { result, sendAndRead, finish } = renderStreamingHook({
        onMessageEvent,
      });

      await sendAndRead({ type: 'message', message: { id: 'partial' } });
      act(() => result.current.abort());

      expect(onMessageEvent).toHaveBeenCalledWith(
        expect.objectContaining({ message: { id: 'partial' } }),
      );
      await finish();
    });

    it('batches a run started before the chat page mounted and applies it on cancel', async () => {
      const onMessageEvent = vi.fn();
      const { result, sendAndRead, finish, fetchMock } = renderStreamingHook(
        { onMessageEvent },
        { startedBeforeMount: true },
      );

      await sendAndRead(
        { type: 'message', message: { id: 'answer', text: 'H' } },
        { type: 'message', message: { id: 'answer', text: 'Hallo' } },
      );
      expect(onMessageEvent).not.toHaveBeenCalled();

      act(() => vi.advanceTimersToNextFrame());
      expect(onMessageEvent.mock.calls.map(([event]) => event)).toEqual([
        { type: 'message', message: { id: 'answer', text: 'Hallo' } },
      ]);

      await sendAndRead({
        type: 'message',
        message: { id: 'answer', text: 'Hallo Welt' },
      });
      act(() => result.current.abort());

      expect(onMessageEvent).toHaveBeenLastCalledWith({
        type: 'message',
        message: { id: 'answer', text: 'Hallo Welt' },
      });
      expect(fetchMock).not.toHaveBeenCalled();
      await finish();
    });
  });

  describe('OpenPanel run funnel', () => {
    const track = vi.fn();

    beforeEach(() => {
      track.mockReset();
      openPanel.client = { track };
    });

    afterEach(() => {
      openPanel.client = null;
    });

    function renderSendHook() {
      const stream = createControlledSseResponse();
      vi.stubGlobal(
        'fetch',
        vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
          init?.signal?.addEventListener('abort', () =>
            stream.fail(new DOMException('Aborted', 'AbortError')),
          );
          return Promise.resolve(stream.response);
        }),
      );
      const queryClient = new QueryClient();
      const { result } = renderHook(() => useMessageSend({ threadId }), {
        wrapper: ({ children }) =>
          createElement(QueryClientProvider, { client: queryClient }, children),
      });
      return { result, stream };
    }

    function trackedEvents() {
      return track.mock.calls.map(([name]) => name as string);
    }

    const userMessage = (id: string) => ({
      id,
      role: 'user',
      content: [{ type: 'text', text: 'Frage' }],
    });
    const runEnd = { type: 'session', streaming: false, threadId };

    it('sends run_started and ai_output_delivered once for a completed message', async () => {
      const { result, stream } = renderSendHook();

      await act(async () => {
        const send = result.current.sendTextMessage({
          text: 'Frage',
          voiceInput: true,
        });
        stream.send({ type: 'session', streaming: true, threadId });
        stream.send({ type: 'message', message: userMessage('sent') });
        stream.send(runEnd);
        stream.close();
        await send;
      });

      expect(trackedEvents()).toEqual(['run_started', 'ai_output_delivered']);
      expect(track).toHaveBeenCalledWith(
        'run_started',
        expect.objectContaining({ thread_turn: 'first', voice_input: true }),
      );
    });

    it('sends only run_started for a run that fails', async () => {
      const { result, stream } = renderSendHook();

      await act(async () => {
        const send = result.current.sendTextMessage({ text: 'Frage' });
        stream.send({ type: 'message', message: userMessage('failed') });
        stream.send({ type: 'error', code: 'RUN_FAILED' });
        stream.send(runEnd);
        stream.close();
        await send;
      });

      expect(trackedEvents()).toEqual(['run_started']);
      expect(track).toHaveBeenCalledWith(
        'run_started',
        expect.objectContaining({ voice_input: false }),
      );
    });

    it('sends only run_started for a run the user stops', async () => {
      const { result, stream } = renderSendHook();

      let send: Promise<void> | undefined;
      act(() => {
        send = result.current.sendTextMessage({ text: 'Frage' });
      });
      await act(async () => {
        stream.send({ type: 'message', message: userMessage('stopped') });
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      act(() => result.current.abort());
      await act(async () => await send);

      expect(trackedEvents()).toEqual(['run_started']);
    });

    it('reports a reattached run once and never as started', async () => {
      const replay = [
        { type: 'session', streaming: true, threadId },
        { type: 'message', message: userMessage('reattached') },
        runEnd,
      ];

      for (let attempt = 0; attempt < 2; attempt++) {
        const { result, stream } = renderSendHook();
        await act(async () => {
          const attach = result.current.attach();
          replay.forEach((event) => stream.send(event));
          stream.close();
          await attach;
        });
      }

      expect(trackedEvents()).toEqual(['ai_output_delivered']);
    });
  });
});
