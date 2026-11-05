import { useTeamsControllerGetTeamRolePermissions } from '@/shared/api/generated/ayunisCoreAPI';

/**
 * What each team role grants within the team. The role matrix is edited in
 * another (admin) session, so keep it always-stale like `useMyPermissions`.
 */
export function useTeamRolePermissions(teamId: string) {
  const { data } = useTeamsControllerGetTeamRolePermissions(teamId, {
    query: { staleTime: 0, refetchOnWindowFocus: true },
  });

  return { rolePermissions: data?.roles };
}
