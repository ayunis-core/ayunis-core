import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspace } from './useWorkspace';

const mocks = vi.hoisted(() => ({
  useFindOne: vi.fn(),
  getQueryKey: vi.fn((id: string) => ['workspace', id]),
}));

vi.mock('@/shared/api', () => ({
  useWorkspacesControllerFindOne: mocks.useFindOne,
  getWorkspacesControllerFindOneQueryKey: mocks.getQueryKey,
}));

describe('useWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('disables the request without an id', () => {
    renderHook(() => useWorkspace(null));

    expect(mocks.useFindOne).toHaveBeenLastCalledWith('', {
      query: { enabled: false, queryKey: ['workspace', ''] },
    });
  });
});
