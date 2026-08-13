import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAssignThreadToWorkspace } from './useAssignThreadToWorkspace';

const { assignWorkspace, routerInvalidate } = vi.hoisted(() => ({
  assignWorkspace: vi.fn(),
  routerInvalidate: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: routerInvalidate }),
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  threadsControllerAssignWorkspace: assignWorkspace,
  getThreadsControllerFindAllQueryKey: () => ['threads'],
  getThreadsControllerFindOneQueryKey: (id: string) => ['threads', id],
  getWorkspacesControllerFindAllQueryKey: () => ['workspaces'],
  getFavoritesControllerFindAllQueryKey: () => ['favorites'],
}));

vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

describe('useAssignThreadToWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assignWorkspace.mockResolvedValue(undefined);
  });

  it('invalidates favorites after assigning a pinned thread', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useAssignThreadToWorkspace(), {
      wrapper,
    });

    await act(() =>
      result.current.mutateAsync({
        threadId: 'thread-id',
        workspaceId: 'workspace-id',
      }),
    );

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['favorites'],
    });
  });
});
