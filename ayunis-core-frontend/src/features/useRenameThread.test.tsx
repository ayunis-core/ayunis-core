import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRenameThread } from './useRenameThread';

const { updateTitle } = vi.hoisted(() => ({ updateTitle: vi.fn() }));

vi.mock('@/shared/api', () => ({
  threadsControllerUpdateTitle: updateTitle,
  getThreadsControllerFindAllQueryKey: () => ['threads'],
  getThreadsControllerFindOneQueryKey: (id: string) => ['threads', id],
  getFavoritesControllerFindAllQueryKey: () => ['favorites'],
}));

describe('useRenameThread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateTitle.mockResolvedValue(undefined);
  });

  it('invalidates favorites after renaming a pinned thread', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useRenameThread(), { wrapper });

    act(() => result.current.rename('thread-id', 'New title'));

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['favorites'],
      });
    });
  });
});
