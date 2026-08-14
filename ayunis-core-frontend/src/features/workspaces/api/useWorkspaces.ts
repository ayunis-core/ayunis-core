import {
  useWorkspacesControllerFindAll,
  getWorkspacesControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useIsWorkspacesEnabled } from '@/features/feature-toggles';
import type { Workspace } from '@/features/workspaces/model/types';

export function useWorkspaces() {
  const isEnabled = useIsWorkspacesEnabled();
  const params = { limit: 100, offset: 0 };
  const { data, isLoading, error } = useWorkspacesControllerFindAll(params, {
    query: {
      queryKey: getWorkspacesControllerFindAllQueryKey(params),
      // The controller 404s while the feature is off, which would otherwise
      // surface as an error on every page that renders the sidebar.
      enabled: isEnabled,
    },
  });

  const workspaces: Workspace[] = data?.data ?? [];

  return {
    workspaces,
    isLoading,
    error,
  };
}
