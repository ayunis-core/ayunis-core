import { useAuthenticationControllerMe } from '@/shared/api';
import { createAuthorization } from '@/features/permissions/lib/authorization';
import { useMyPermissions } from './useMyPermissions';
import { useMyTeamAdminTeamIds } from './useMyTeamAdminTeamIds';

export function useAuthorization() {
  const { data: user, isLoading: isUserLoading } =
    useAuthenticationControllerMe();
  const { permissions, isLoading: arePermissionsLoading } = useMyPermissions();
  const { teamAdminTeamIds, isLoading: areTeamsLoading } =
    useMyTeamAdminTeamIds();

  return {
    ...createAuthorization(user?.role, permissions, teamAdminTeamIds),
    isLoading: isUserLoading || arePermissionsLoading || areTeamsLoading,
  };
}
