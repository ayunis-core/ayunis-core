import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceOwnershipControllerCandidates } from '@/shared/api/generated/ayunisCoreAPI';
import { useOwnershipCandidates } from './useOwnershipCandidates';

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useWorkspaceOwnershipControllerCandidates: vi.fn(),
}));

const candidatesQuery = vi.mocked(useWorkspaceOwnershipControllerCandidates);
const lena = { id: 'lena', name: 'Lena Hoffmann', level: 'full' };

function answer(state: {
  people?: (typeof lena)[];
  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
}) {
  candidatesQuery.mockReturnValue({
    data: state.people ? { people: state.people } : undefined,
    isLoading: state.isLoading ?? false,
    isFetching: state.isFetching ?? false,
    isError: state.isError ?? false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useWorkspaceOwnershipControllerCandidates>);
}

describe('useOwnershipCandidates', () => {
  beforeEach(() => candidatesQuery.mockReset());

  it('always asks the server again when the dialog opens', () => {
    answer({ people: [lena] });
    renderHook(() => useOwnershipCandidates('workspace-1', true));

    expect(candidatesQuery).toHaveBeenCalledWith('workspace-1', {
      query: { enabled: true, staleTime: 0 },
    });
  });

  it('keeps loading while an empty cached list is refreshed', () => {
    answer({ people: [], isFetching: true });
    const { result } = renderHook(() =>
      useOwnershipCandidates('workspace-1', true),
    );

    expect(result.current).toMatchObject({
      candidates: [],
      isLoading: true,
      isError: false,
    });
  });

  it('shows cached people while refreshing', () => {
    answer({ people: [lena], isFetching: true });
    const { result } = renderHook(() =>
      useOwnershipCandidates('workspace-1', true),
    );

    expect(result.current).toMatchObject({
      candidates: [lena],
      isLoading: false,
    });
  });

  it('reports a failed load instead of an empty list', () => {
    answer({ isError: true });
    const { result } = renderHook(() =>
      useOwnershipCandidates('workspace-1', true),
    );

    expect(result.current).toMatchObject({
      candidates: [],
      isLoading: false,
      isError: true,
    });
  });
});
