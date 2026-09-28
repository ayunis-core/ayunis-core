import {
  getWorkspacesControllerFindOneQueryKey,
  useWorkspacesControllerFindOne,
} from '@/shared/api';

export function useWorkspace(workspaceId: string | null) {
  const id = workspaceId ?? '';
  const query = useWorkspacesControllerFindOne(id, {
    query: {
      enabled: Boolean(workspaceId),
      queryKey: getWorkspacesControllerFindOneQueryKey(id),
    },
  });

  return {
    workspace: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
