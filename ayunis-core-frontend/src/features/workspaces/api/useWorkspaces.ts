import {
  useWorkspacesControllerFindAll,
  getWorkspacesControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { Workspace } from '@/features/workspaces/model/types';

export function useWorkspaces() {
  const params = { limit: 100, offset: 0 };
  const { data, isLoading, error } = useWorkspacesControllerFindAll(
    {
      ...params,
    },
    {
      query: {
        queryKey: getWorkspacesControllerFindAllQueryKey(params),
      },
    },
  );

  const workspaces: Workspace[] = data?.data ?? [];

  return {
    workspaces,
    isLoading,
    error,
  };
}
