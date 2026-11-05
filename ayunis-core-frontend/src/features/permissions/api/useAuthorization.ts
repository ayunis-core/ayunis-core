import { useAuthenticationControllerMe } from '@/shared/api';
import { createAuthorization } from '@/features/permissions/lib/authorization';
import { useMyPermissions } from './useMyPermissions';
import { useMyTeams } from './useMyTeams';

export function useAuthorization() {
  const { data: user, isLoading: isUserLoading } =
    useAuthenticationControllerMe();
  const { permissions, isLoading: arePermissionsLoading } = useMyPermissions();
  const { teams, isLoading: areTeamsLoading } = useMyTeams();

  return {
    ...createAuthorization(user?.role, permissions, teams),
    isLoading: isUserLoading || arePermissionsLoading || areTeamsLoading,
  };
}
