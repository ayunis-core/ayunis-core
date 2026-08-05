import { useAuthenticationControllerMe } from '@/shared/api';
import { createAuthorization } from '../lib/authorization';
import { useMyPermissions } from './useMyPermissions';

export function useAuthorization() {
  const { data: user, isLoading: isUserLoading } =
    useAuthenticationControllerMe();
  const { permissions, isLoading: arePermissionsLoading } = useMyPermissions();

  return {
    ...createAuthorization(user?.role, permissions),
    isLoading: isUserLoading || arePermissionsLoading,
  };
}
