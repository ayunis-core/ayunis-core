import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatStarted } from './chat-config';
import type { ChatStartRequest } from './chat-start';
import { createChatRunLifecycle } from './run-lifecycle';
import { stopChatStart, useChatStart } from './use-chat-start';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  upload: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@ayunis/api-client/request', () => ({
  customAxiosInstance: mocks.request,
}));
vi.mock('@ayunis/api-client/source-upload', () => ({
  uploadSourceFile: mocks.upload,
}));
vi.mock('@ayunis/ui/lib/toast', () => ({ toast: { error: mocks.toast } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const thread = { id: 'thread-1', sources: [], messages: [] };

const request: ChatStartRequest = {
  text: 'Fasse den Haushalt zusammen',
  images: [],
  modelId: 'model-1',
  isAnonymous: false,
  sources: [],
  knowledgeBases: [],
  integrations: [],
};

function withFiles(...names: string[]): ChatStartRequest {
  return {
    ...request,
    sources: names.map((name) => ({
      id: name,
      name,
      type: 'text',
      file: new File(['pdf'], name),
    })),
  };
}

function setup(options: { draftKey?: string; settleMs?: number } = {}) {
  const lifecycle = createChatRunLifecycle({
    send: () => Promise.resolve(new Response('')),
  });
  const startRun = vi
    .spyOn(lifecycle, 'startThreadRun')
    .mockImplementation(() => undefined);
  const deferRun = vi.spyOn(lifecycle, 'deferThreadRun');
  const cancelStarted = vi.spyOn(lifecycle, 'cancelStartedThreadRun');
  const onThreadStarted = vi.fn<(started: ChatStarted) => void>();
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const render = () =>
    renderHook(
      () =>
        useChatStart({
          lifecycle,
          events: { onThreadStarted },
          draftKey: options.draftKey,
          settleMs: options.settleMs ?? 0,
        }),
      { wrapper },
    );
  return {
    lifecycle,
    startRun,
    deferRun,
    cancelStarted,
    onThreadStarted,
    render,
  };
}

beforeEach(() => {
  mocks.request.mockImplementation(({ url }: { url: string }) =>
    url === '/threads' ? Promise.resolve(thread) : Promise.resolve({}),
  );
  mocks.upload.mockResolvedValue([]);
});
afterEach(() => vi.clearAllMocks());

describe('useChatStart', () => {
  it('hands off the first message of a chat without files right away', async () => {
    const chat = setup();
    const { result } = chat.render();

    await act(() => result.current.start(request));

    expect(chat.startRun).toHaveBeenCalledWith({
      threadId: thread.id,
      text: request.text,
      images: [],
      skillId: undefined,
      voiceInput: undefined,
    });
    expect(chat.onThreadStarted).toHaveBeenCalledWith(
      expect.objectContaining({ thread }),
    );
  });

  it('holds the first message of a chat with files until they are processed', async () => {
    const chat = setup();
    const { result } = chat.render();

    await act(() => result.current.start(withFiles('haushalt.pdf')));

    expect(chat.startRun).not.toHaveBeenCalled();
    expect(chat.deferRun).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: thread.id, text: request.text }),
    );
    expect(chat.onThreadStarted).toHaveBeenCalledOnce();
    chat.lifecycle.cancelDeferredThreadRun(thread.id);
  });

  // A host that shows the reported chat right away must see its files
  // processing, or the chat sends the held message before they are ready.
  it('reports the started chat with its uploaded files', async () => {
    const uploaded = {
      id: 'source-1',
      name: 'haushalt.pdf',
      status: 'processing',
    };
    mocks.upload.mockResolvedValue([uploaded]);
    const chat = setup();
    const { result } = chat.render();

    await act(() => result.current.start(withFiles('haushalt.pdf')));

    const [[started]] = chat.onThreadStarted.mock.calls;
    expect(started.thread.sources).toEqual([uploaded]);
    chat.lifecycle.cancelDeferredThreadRun(thread.id);
  });

  it('does not open the chat before its files are uploaded', async () => {
    mocks.upload.mockReturnValue(new Promise(() => undefined));
    const chat = setup();
    const { result } = chat.render();

    act(() => void result.current.start(withFiles('haushalt.pdf')));

    await waitFor(() => expect(mocks.upload).toHaveBeenCalledOnce());
    expect(result.current.busy).toBe(true);
    expect(chat.onThreadStarted).not.toHaveBeenCalled();
  });

  it('stops the other uploads when one fails, says why and starts nothing', async () => {
    const signals: AbortSignal[] = [];
    mocks.upload.mockImplementation(
      (file: File, _target: unknown, signal: AbortSignal) => {
        signals.push(signal);
        if (file.name === 'broken.pdf') {
          return Promise.reject(new Error('Unreadable'));
        }
        return new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('Aborted'))),
        );
      },
    );
    const chat = setup();
    const { result } = chat.render();

    await act(() =>
      result.current.start(withFiles('haushalt.pdf', 'broken.pdf')),
    );

    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(mocks.toast).toHaveBeenCalledWith(
      'sources.failedToAdd',
      expect.anything(),
    );
    expect(chat.onThreadStarted).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
  });

  it('stays quiet when the user stops an upload', async () => {
    mocks.upload.mockImplementation(
      (_file: File, _target: unknown, signal: AbortSignal) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('Aborted'))),
        ),
    );
    const chat = setup();
    const { result } = chat.render();
    let started: Promise<void> = Promise.resolve();
    act(() => {
      started = result.current.start(withFiles('haushalt.pdf'));
    });
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledOnce());

    await act(async () => {
      result.current.stop();
      await started;
    });

    expect(mocks.toast).not.toHaveBeenCalled();
    expect(chat.onThreadStarted).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
  });

  it('says why when the chat cannot be created in its mode and reports nothing', async () => {
    mocks.request.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { code: 'MODEL_MODE_UNAVAILABLE' } },
    });
    const chat = setup();
    const { result } = chat.render();

    await act(() => result.current.start({ ...request, mode: 'auto' }));

    expect(mocks.toast).toHaveBeenCalledWith(
      'chat.errorModeUnavailable',
      expect.anything(),
    );
    expect(chat.onThreadStarted).not.toHaveBeenCalled();
  });

  it('withdraws the first message when stopped while the new chat settles', async () => {
    const chat = setup({ settleMs: 60_000 });
    const { result } = chat.render();
    await act(() => result.current.start(request));
    const [[started]] = chat.onThreadStarted.mock.calls;
    expect(result.current.busy).toBe(true);

    act(() => result.current.stop());

    expect(chat.cancelStarted).toHaveBeenCalledWith(thread.id);
    await expect(started.settled).resolves.toBe(false);
    expect(result.current.busy).toBe(false);
  });

  it('keeps a draft’s start in progress across a remount until the host stops it', async () => {
    mocks.request.mockReturnValue(new Promise(() => undefined));
    const chat = setup({ draftKey: 'new:mail-a' });
    const first = chat.render();
    act(() => void first.result.current.start(request));
    await waitFor(() => expect(first.result.current.busy).toBe(true));
    first.unmount();

    const second = chat.render();
    expect(second.result.current.busy).toBe(true);

    act(() => stopChatStart(chat.lifecycle, 'new:mail-a'));
    expect(second.result.current.busy).toBe(false);
  });
});
