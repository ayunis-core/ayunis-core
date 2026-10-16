import { useWorkspaceOwnershipControllerCandidates } from '@/shared/api/generated/ayunisCoreAPI';

export function useOwnershipCandidates(workspaceId: string, enabled: boolean) {
  const { data, isLoading, isFetching, isError, refetch } =
    useWorkspaceOwnershipControllerCandidates(workspaceId, {
      query: { enabled, staleTime: 0 },
    });
  const candidates = data?.people ?? [];
  return {
    candidates,
    isLoading: isLoading || (isFetching && candidates.length === 0),
    isError: isError && !isFetching,
    retry: () => void refetch(),
  };
}
