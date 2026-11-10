import { useWorkspacesControllerGetRolePermissions } from '@/shared/api/generated/ayunisCoreAPI';

/**
 * What each workspace role grants. The role matrix is edited in another
 * (admin) session, so keep it always-stale like `useTeamRolePermissions`.
 */
export function useWorkspaceRolePermissions(
  workspaceId: string,
  enabled: boolean,
) {
  const { data } = useWorkspacesControllerGetRolePermissions(workspaceId, {
    query: { enabled, staleTime: 0, refetchOnWindowFocus: true },
  });

  return { rolePermissions: data?.roles };
}
