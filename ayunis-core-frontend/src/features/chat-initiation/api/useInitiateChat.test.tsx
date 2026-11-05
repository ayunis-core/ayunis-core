import type { ReactNode, PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  abortActiveThreadRun,
  takeStartedThreadRun,
} from '@/features/thread-run';
import { useInitiateChat } from './useInitiateChat';

const threadId = '00000000-0000-0000-0000-000000000001';
const SETTLE_ANIMATION_MS = 2430;

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  createThread: vi.fn(),
  transfer: vi.fn(),
  createSession: vi.fn(),
  complete: vi.fn(),
  abort: vi.fn(),
  handleError: vi.fn(),
  findThread: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useThreadsControllerCreate: () => ({
    mutateAsync: mocks.createThread,
    isPending: false,
    error: null,
  }),
  threadSourcesControllerCreateUpload: mocks.createSession,
  threadSourcesControllerCompleteUpload: mocks.complete,
  sourceUploadsControllerAbort: mocks.abort,
  threadsControllerFindOne: mocks.findThread,
  threadKnowledgeBasesControllerAddKnowledgeBase: vi.fn(),
  threadMcpIntegrationsControllerAddMcpIntegration: vi.fn(),
  getThreadsControllerFindAllQueryKey: () => ['threads'],
  getThreadsControllerFindOneQueryKey: (id: string) => ['threads', id],
  getWorkspacesControllerFindAllQueryKey: () => ['workspaces'],
  getWorkspacesControllerFindOneQueryKey: (id: string) => ['workspaces', id],
}));

vi.mock('@/shared/lib/source-upload/transfer-source-file', () => ({
  transferSourceFile: mocks.transfer,
}));
vi.mock('@/shared/lib/handle-source-upload-error', () => ({
  default: mocks.handleError,
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

function sentRunRequests(): RequestInit[] {
  return vi
    .mocked(fetch)
    .mock.calls.filter(
      ([url]) => typeof url === 'string' && url.endsWith('/runs/send-message'),
    )
    .map(([, init]) => init ?? {});
}

const chatParams = {
  message: 'Fasse den Haushalt zusammen',
  images: [],
  modelId: 'model-1',
  sources: [],
  knowledgeBases: [],
  mcpIntegrations: [],
  isAnonymous: false,
  skillId: 'skill-1',
};

describe(useInitiateChat.name, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')));
    mocks.createThread.mockResolvedValue({ id: threadId });
    mocks.findThread.mockResolvedValue({ sources: [] });
    mocks.createSession.mockResolvedValue({
      id: 'upload-1',
      multipart: false,
      partSizeBytes: 8 * 1024 * 1024,
    });
    mocks.complete.mockResolvedValue([]);
    mocks.transfer.mockResolvedValue(undefined);
    mocks.abort.mockResolvedValue(undefined);
  });

  afterEach(() => {
    takeStartedThreadRun(threadId);
    abortActiveThreadRun(threadId);
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('sends the first message while the settle animation is still playing', async () => {
    const { result } = renderHook(() => useInitiateChat(), { wrapper });

    await act(async () => {
      void result.current.initiateChat(chatParams);
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(sentRunRequests()).toHaveLength(1);
    const form = sentRunRequests()[0].body as FormData;
    expect(form.get('text')).toBe('Fasse den Haushalt zusammen');
    expect(form.get('skillId')).toBe('skill-1');
    expect(mocks.navigate).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(SETTLE_ANIMATION_MS));

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/chats/$threadId',
      params: { threadId },
    });
    expect(sentRunRequests()).toHaveLength(1);
    expect(takeStartedThreadRun(threadId)).toMatchObject({
      text: 'Fasse den Haushalt zusammen',
    });
  });

  it('aborts the first message when cancelled during the settle animation', async () => {
    const { result } = renderHook(() => useInitiateChat(), { wrapper });
    await act(async () => {
      void result.current.initiateChat(chatParams);
      await vi.advanceTimersByTimeAsync(0);
    });

    act(() => result.current.cancel());
    await act(() => vi.advanceTimersByTimeAsync(SETTLE_ANIMATION_MS));

    expect(sentRunRequests()[0].signal?.aborted).toBe(true);
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(takeStartedThreadRun(threadId)).toBeNull();
  });

  it('aborts the first message when cancelled while the chat route loads', async () => {
    const { result } = renderHook(() => useInitiateChat(), { wrapper });
    await act(async () => {
      void result.current.initiateChat(chatParams);
      await vi.advanceTimersByTimeAsync(SETTLE_ANIMATION_MS);
    });
    expect(mocks.navigate).toHaveBeenCalled();

    act(() => result.current.cancel());

    expect(sentRunRequests()[0].signal?.aborted).toBe(true);
    expect(takeStartedThreadRun(threadId)).toBeNull();
  });

  it('sends the first message only after attached files are processed', async () => {
    let finishUpload: () => void = () => undefined;
    mocks.transfer.mockReturnValue(
      new Promise<void>((resolve) => {
        finishUpload = resolve;
      }),
    );
    const { result } = renderHook(() => useInitiateChat(), { wrapper });

    await act(async () => {
      void result.current.initiateChat({
        ...chatParams,
        sources: [
          {
            id: 'source-1',
            name: 'haushalt.pdf',
            type: 'text',
            file: new File(['pdf'], 'haushalt.pdf'),
          },
        ],
      });
      await vi.advanceTimersByTimeAsync(SETTLE_ANIMATION_MS);
    });
    expect(sentRunRequests()).toHaveLength(0);

    await act(async () => {
      finishUpload();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mocks.findThread).toHaveBeenCalledWith(threadId);
    expect(sentRunRequests()).toHaveLength(1);
  });
});

function setup() {
  const client = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useInitiateChat({ settleAnimation: false }), {
    wrapper,
  });
}
const input = {
  message: 'Review this budget',
  images: [],
  modelId: 'model-1',
  sources: [
    {
      id: 'pending-budget',
      name: 'Budget.pdf',
      type: 'text' as const,
      file: new File(['budget'], 'Budget.pdf'),
    },
  ],
  knowledgeBases: [],
  mcpIntegrations: [],
  isAnonymous: false,
};

describe('new-chat upload cleanup', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.createThread.mockResolvedValue({ id: 'new-thread' });
    mocks.createSession.mockResolvedValue({
      id: 'upload-1',
      multipart: false,
      partSizeBytes: 8 * 1024 * 1024,
      expiresAt: '2026-11-05T20:00:00Z',
    });
    mocks.abort.mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('aborts a reserved session when transfer fails', async () => {
    const original = new Error('transfer failed');
    mocks.transfer.mockRejectedValue(original);
    const { result } = setup();
    await act(async () => result.current.initiateChat(input));
    expect(mocks.abort).toHaveBeenCalledWith('upload-1');
    expect(mocks.handleError).toHaveBeenCalledWith(
      original,
      expect.any(Function),
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('uses an independent cleanup request after the upload signal expires', async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    const original = new DOMException('Upload timed out', 'TimeoutError');
    mocks.transfer.mockImplementation(async () => {
      controller.abort(original);
      throw original;
    });
    mocks.abort.mockRejectedValue(new Error('cleanup unavailable'));
    const { result } = setup();
    await act(async () => result.current.initiateChat(input));
    expect(mocks.abort).toHaveBeenCalledWith('upload-1');
    expect(mocks.handleError).toHaveBeenCalledWith(
      original,
      expect.any(Function),
    );
  });

  it('does not abort when session creation fails before an ID is known', async () => {
    mocks.createSession.mockRejectedValue(new Error('session rejected'));
    const { result } = setup();
    await act(async () => result.current.initiateChat(input));
    expect(mocks.abort).not.toHaveBeenCalled();
  });
});
