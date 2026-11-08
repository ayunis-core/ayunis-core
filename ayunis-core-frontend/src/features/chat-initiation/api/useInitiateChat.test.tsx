import type { ReactNode } from 'react';
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
  addFileSource: vi.fn(),
  findThread: vi.fn(),
  cancelRun: vi.fn(() => Promise.resolve()),
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
  threadSourcesControllerAddFileSource: mocks.addFileSource,
  threadsControllerFindOne: mocks.findThread,
  threadKnowledgeBasesControllerAddKnowledgeBase: vi.fn(),
  threadMcpIntegrationsControllerAddMcpIntegration: vi.fn(),
  getThreadsControllerFindAllQueryKey: () => ['threads'],
  getThreadsControllerFindOneQueryKey: (id: string) => ['threads', id],
  getWorkspacesControllerFindAllQueryKey: () => ['workspaces'],
  getWorkspacesControllerFindOneQueryKey: (id: string) => ['workspaces', id],
  activeRunsControllerCancel: mocks.cancelRun,
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
    expect(mocks.cancelRun).toHaveBeenCalledWith(threadId);
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
    mocks.addFileSource.mockReturnValue(
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
