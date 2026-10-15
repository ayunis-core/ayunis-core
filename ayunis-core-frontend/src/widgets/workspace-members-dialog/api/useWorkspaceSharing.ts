import {
  useWorkspaceSharingControllerCandidates,
  useWorkspaceSharingControllerSharing,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useWorkspaceSharing(workspaceId: string, enabled: boolean) {
  const query = useWorkspaceSharingControllerSharing(workspaceId, {
    query: { enabled },
  });
  return {
    sharing: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useShareCandidates(workspaceId: string, enabled: boolean) {
  const query = useWorkspaceSharingControllerCandidates(workspaceId, {
    query: { enabled },
  });
  return {
    candidates: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
