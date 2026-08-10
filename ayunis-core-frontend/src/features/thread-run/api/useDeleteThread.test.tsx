import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  abortActiveThreadRun,
  registerActiveThreadRun,
} from '../model/active-thread-run';
import { useDeleteThread } from './useDeleteThread';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('@/shared/api', () => ({
  getThreadsControllerFindAllQueryKey: () => ['threads'],
  useThreadsControllerDelete: () => ({ mutate }),
}));

const threadId = '00000000-0000-0000-0000-000000000001';
const otherThreadId = '00000000-0000-0000-0000-000000000002';

describe('useDeleteThread', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    abortActiveThreadRun(threadId);
    abortActiveThreadRun(otherThreadId);
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
