import {
  getWorkspacesControllerFindOneQueryKey,
  useWorkspacesControllerFindOne,
} from '@/shared/api';
import { useIsWorkspacesEnabled } from '@/features/feature-toggles';

export function useWorkspace(workspaceId: string | null) {
  const workspacesEnabled = useIsWorkspacesEnabled();
  const id = workspaceId ?? '';
  const query = useWorkspacesControllerFindOne(id, {
    query: {
      enabled: workspacesEnabled && Boolean(workspaceId),
      queryKey: getWorkspacesControllerFindOneQueryKey(id),
    },
  });

  return {
    workspace: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
