import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspace } from './useWorkspace';

const mocks = vi.hoisted(() => ({
  useFindOne: vi.fn(),
  getQueryKey: vi.fn((id: string) => ['workspace', id]),
  workspacesEnabled: true,
}));

vi.mock('@/shared/api', () => ({
  useWorkspacesControllerFindOne: mocks.useFindOne,
  getWorkspacesControllerFindOneQueryKey: mocks.getQueryKey,
}));

vi.mock('@/features/feature-toggles', () => ({
  useIsWorkspacesEnabled: () => mocks.workspacesEnabled,
}));

describe('useWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workspacesEnabled = true;
    mocks.useFindOne.mockReturnValue({
      data: { id: 'workspace-id', name: 'Finance' },
      isLoading: false,
      error: null,
    });
  });

  it('loads the requested workspace by id', () => {
    const { result } = renderHook(() => useWorkspace('workspace-id'));

    expect(result.current.workspace).toEqual({
      id: 'workspace-id',
      name: 'Finance',
    });
    expect(mocks.useFindOne).toHaveBeenCalledWith('workspace-id', {
      query: {
        enabled: true,
        queryKey: ['workspace', 'workspace-id'],
      },
    });
  });

  it('disables the request without an id or while workspaces are disabled', () => {
    const { rerender } = renderHook(
      ({ workspaceId }: { workspaceId: string | null }) =>
        useWorkspace(workspaceId),
      { initialProps: { workspaceId: null as string | null } },
    );

    expect(mocks.useFindOne).toHaveBeenLastCalledWith('', {
      query: { enabled: false, queryKey: ['workspace', ''] },
    });

    mocks.workspacesEnabled = false;
    rerender({ workspaceId: 'workspace-id' });

    expect(mocks.useFindOne).toHaveBeenLastCalledWith('workspace-id', {
      query: { enabled: false, queryKey: ['workspace', 'workspace-id'] },
    });
  });
});
