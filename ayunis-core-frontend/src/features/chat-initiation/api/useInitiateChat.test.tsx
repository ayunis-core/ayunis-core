import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  abortActiveThreadRun,
  cancelDeferredThreadRun,
  getDeferredThreadRun,
  takeStartedThreadRun,
} from '@/features/thread-run';
import { showError } from '@/shared/lib/toast';
import { useInitiateChat } from './useInitiateChat';

const threadId = '00000000-0000-0000-0000-000000000001';
const SETTLE_ANIMATION_MS = 2430;
const FIVE_MINUTES_MS = 300_000;
const pdfSource = {
  id: 'source-1',
  name: 'haushalt.pdf',
  type: 'text' as const,
  file: new File(['pdf'], 'haushalt.pdf'),
};

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  createThread: vi.fn(),
  transfer: vi.fn(),
  createSession: vi.fn(),
  complete: vi.fn(),
  abort: vi.fn(),
  handleError: vi.fn(),
  findThread: vi.fn(),
  cancelRun: vi.fn(() => Promise.resolve()),
  track: vi.fn(),
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
  activeRunsControllerCancel: mocks.cancelRun,
}));

vi.mock('@/shared/lib/source-upload/transfer-source-file', () => ({
  transferSourceFile: mocks.transfer,
}));
vi.mock('@/shared/lib/handle-source-upload-error', () => ({
  default: mocks.handleError,
}));
vi.mock('@/shared/lib/openpanel', () => ({
  openPanel: { track: mocks.track },
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
    cancelDeferredThreadRun(threadId);
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

  it('opens the chat while an attached file is still processing and leaves the first message to be sent there', async () => {
    mocks.findThread.mockResolvedValue({
      sources: [{ id: 'source-1', status: 'processing' }],
    });
    const { result } = renderHook(() => useInitiateChat(), { wrapper });

    await act(async () => {
      void result.current.initiateChat({
        ...chatParams,
        sources: [pdfSource],
      });
      await vi.advanceTimersByTimeAsync(FIVE_MINUTES_MS);
    });

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/chats/$threadId',
      params: { threadId },
    });
    expect(showError).not.toHaveBeenCalled();
    expect(sentRunRequests()).toHaveLength(0);
    expect(getDeferredThreadRun(threadId)).toMatchObject({
      text: 'Fasse den Haushalt zusammen',
      skillId: 'skill-1',
    });
  });

  it('drops the waiting first message when cancelled during the settle animation', async () => {
    const { result } = renderHook(() => useInitiateChat(), { wrapper });
    await act(async () => {
      void result.current.initiateChat({
        ...chatParams,
        sources: [pdfSource],
      });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(getDeferredThreadRun(threadId)).not.toBeNull();

    act(() => result.current.cancel());
    await act(() => vi.advanceTimersByTimeAsync(SETTLE_ANIMATION_MS));

    expect(getDeferredThreadRun(threadId)).toBeNull();
    expect(mocks.navigate).toHaveBeenCalled();
    expect(sentRunRequests()).toHaveLength(0);
  });
});

describe('chat_started tracking', () => {
  const createdThread = {
    id: threadId,
    workspaceId: null,
    isAnonymous: false,
    mode: null,
    knowledgeBases: [],
    sources: [],
    mcpIntegrations: [],
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')));
    mocks.createThread.mockResolvedValue(createdThread);
    mocks.track.mockResolvedValue(undefined);
  });

  afterEach(() => {
    takeStartedThreadRun(threadId);
    abortActiveThreadRun(threadId);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  async function startChat(
    params: Parameters<ReturnType<typeof useInitiateChat>['initiateChat']>[0],
  ) {
    const { result } = renderHook(
      () => useInitiateChat({ settleAnimation: false }),
      { wrapper },
    );
    await act(() => result.current.initiateChat(params));
  }

  it('sends one chat_started with the context of a workspace chat started with a knowledge base in Auto', async () => {
    mocks.createThread.mockResolvedValue({
      ...createdThread,
      workspaceId: 'workspace-1',
      mode: 'auto',
    });

    await startChat({
      ...chatParams,
      modelId: undefined,
      mode: 'auto',
      workspaceId: 'workspace-1',
      knowledgeBases: [{ id: 'kb-1', name: 'Haushaltsplan 2026' }],
      skillId: undefined,
    });

    expect(mocks.track.mock.calls).toEqual([
      [
        'chat_started',
        {
          workspace_context: true,
          anonymous_mode: false,
          has_knowledge_base: true,
          has_source: false,
          has_integration: false,
          mode: 'auto',
          has_skill: false,
        },
      ],
    ]);
  });

  it('reports a chat started from a skill with a picked model', async () => {
    await startChat(chatParams);

    expect(mocks.track).toHaveBeenCalledExactlyOnceWith(
      'chat_started',
      expect.objectContaining({ mode: 'model', has_skill: true }),
    );
  });

  it('sends no chat_started when the thread cannot be created', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.createThread.mockRejectedValue(new Error('server down'));

    await startChat(chatParams);

    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('still opens the new chat when sending chat_started fails', async () => {
    mocks.track.mockImplementation(() => {
      throw new Error('analytics down');
    });

    await startChat(chatParams);

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/chats/$threadId',
      params: { threadId },
    });
  });
});
