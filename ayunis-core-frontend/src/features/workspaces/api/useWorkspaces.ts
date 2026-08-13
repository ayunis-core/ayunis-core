import {
  useWorkspacesControllerFindAll,
  getWorkspacesControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useIsWorkspacesEnabled } from '@/features/feature-toggles';
import type { Workspace } from '../model/types';

export function useWorkspaces() {
  const isEnabled = useIsWorkspacesEnabled();
  const { data, isLoading, error } = useWorkspacesControllerFindAll({
    query: {
      queryKey: getWorkspacesControllerFindAllQueryKey(),
      // The controller 404s while the feature is off, which would otherwise
      // surface as an error on every page that renders the sidebar.
      enabled: isEnabled,
    },
  });

  const workspaces: Workspace[] = data ?? [];

  return {
    workspaces,
    isLoading,
    error,
  };
}
