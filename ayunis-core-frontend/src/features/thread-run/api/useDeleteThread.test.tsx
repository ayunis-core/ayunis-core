import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  abortActiveThreadRun,
  registerActiveThreadRun,
} from '@/features/thread-run/model/active-thread-run';
import { useDeleteThread } from './useDeleteThread';
import { readChatDraft, writeChatDraft } from '@/shared/lib/chat-draft-storage';

const { invalidateRouter, mutate } = vi.hoisted(() => ({
  invalidateRouter: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('@/shared/api', () => ({
  getFavoritesControllerFindAllQueryKey: () => ['favorites'],
  getThreadsControllerFindAllQueryKey: () => ['threads'],
  useThreadsControllerDelete: () => ({ mutate }),
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: invalidateRouter }),
}));

const threadId = '00000000-0000-0000-0000-000000000001';
const otherThreadId = '00000000-0000-0000-0000-000000000002';

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('useDeleteThread', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createMemoryStorage(),
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });
  afterEach(() => {
    abortActiveThreadRun(threadId);
    abortActiveThreadRun(otherThreadId);
  });

  it('clears the local draft after the thread is deleted', () => {
    writeChatDraft(threadId, 'sensitive unsent prompt');
    expect(readChatDraft(threadId)).toBe('sensitive unsent prompt');
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useDeleteThread({}), { wrapper });

    act(() => result.current.deleteChat(threadId));
    const mutationCall = mutate.mock.calls[0] as unknown as [
      unknown,
      { onSuccess: () => void },
    ];
    act(() => mutationCall[1].onSuccess());

    expect(readChatDraft(threadId)).toBe('');
  });

  it('resets local run state and aborts only the deleted thread before deleting', () => {
    const controller = new AbortController();
    const otherController = new AbortController();
    const onBeforeDelete = vi.fn();
    registerActiveThreadRun(threadId, controller);
    registerActiveThreadRun(otherThreadId, otherController);
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useDeleteThread({ onBeforeDelete }), {
      wrapper,
    });

    act(() => result.current.deleteChat(threadId));

    expect(onBeforeDelete).toHaveBeenCalledOnce();
    expect(controller.signal.aborted).toBe(true);
    expect(otherController.signal.aborted).toBe(false);
    expect(onBeforeDelete.mock.invocationCallOrder[0]).toBeLessThan(
      mutate.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
    expect(mutate).toHaveBeenCalledWith(
      { id: threadId },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
