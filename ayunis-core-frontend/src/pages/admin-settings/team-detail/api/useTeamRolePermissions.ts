import { useIsFeatureEnabled } from '@/features/feature-toggles';
import { useTeamsControllerGetTeamRolePermissions } from '@/shared/api/generated/ayunisCoreAPI';

/**
 * What each team role grants within the team. The role matrix is edited in
 * another (admin) session, so keep it always-stale like `useMyPermissions`.
 * Team recordings are hidden while recordings are switched off.
 */
export function useTeamRolePermissions(teamId: string) {
  const recordingsEnabled = useIsFeatureEnabled('recordingsEnabled');
  const { data } = useTeamsControllerGetTeamRolePermissions(teamId, {
    query: { staleTime: 0, refetchOnWindowFocus: true },
  });

  const rolePermissions = recordingsEnabled
    ? data?.roles
    : data?.roles.map((role) => ({
        ...role,
        permissions: role.permissions.filter(
          (permission) => permission !== 'manage_team_recordings',
        ),
      }));
  return { rolePermissions };
}
