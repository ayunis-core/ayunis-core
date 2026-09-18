import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useThreads } from './useThreads';

const mocks = vi.hoisted(() => ({
  useFindAll: vi.fn(),
  getQueryKey: vi.fn((params: Record<string, unknown>) => ['threads', params]),
  workspacesEnabled: true,
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useThreadsControllerFindAll: mocks.useFindAll,
  getThreadsControllerFindAllQueryKey: mocks.getQueryKey,
}));

vi.mock('@/features/feature-toggles', () => ({
  useIsWorkspacesEnabled: () => mocks.workspacesEnabled,
}));

describe('useThreads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workspacesEnabled = true;
    mocks.useFindAll.mockReturnValue({
      data: { data: [{ id: 'thread-id' }], pagination: { total: 1 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('asks only for chats outside any workspace', () => {
    renderHook(() => useThreads());

    expect(mocks.useFindAll).toHaveBeenCalledWith(
      { limit: 20, offset: 0, unfiled: true },
      {
        query: {
          queryKey: ['threads', { limit: 20, offset: 0, unfiled: true }],
        },
      },
    );
  });

  it('asks for every chat while workspaces are switched off', () => {
    mocks.workspacesEnabled = false;

    renderHook(() => useThreads());

    expect(mocks.useFindAll).toHaveBeenCalledWith(
      { limit: 20, offset: 0 },
      { query: { queryKey: ['threads', { limit: 20, offset: 0 }] } },
    );
  });

  it('reports more chats than the sidebar shows', () => {
    mocks.useFindAll.mockReturnValue({
      data: { data: [], pagination: { total: 21 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useThreads());

    expect(result.current.hasMore).toBe(true);
  });
});
