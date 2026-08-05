import { useMyPermissionsControllerGetMine } from '@/shared/api';
import { createAuthorization } from '../lib/authorization';

export type { AppPermission } from '../lib/authorization';

/**
 * The current user's effective permissions. Admins implicitly hold all of them
 * (the backend expands that). `can` returns false while loading so a control
 * the user may not hold never flashes before the answer arrives.
 */
export function useMyPermissions() {
  const { data, isLoading } = useMyPermissionsControllerGetMine({
    query: {
      // Permissions are granted by an admin in a *different* session, so the
      // holder's cache can't know they changed. Keep this query always-stale
      // (overriding the 5m global default) so newly granted controls appear on
      // the next navigation or tab refocus instead of needing a hard reload.
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
  });
  const permissions = data?.permissions ?? [];
  const { can } = createAuthorization(undefined, permissions);

  return {
    permissions,
    isLoading,
    can,
  };
}
