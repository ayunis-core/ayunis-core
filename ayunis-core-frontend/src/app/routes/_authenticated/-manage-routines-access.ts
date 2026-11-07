import type { QueryClient } from '@tanstack/react-query';
import { createAuthorization } from '@/features/permissions';
import {
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
  getMyPermissionsControllerGetMineQueryOptions,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { MeResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

/** Routine management needs the routines feature and the manage routines permission. */
export async function canManageRoutines(
  queryClient: QueryClient,
  user: MeResponseDto,
): Promise<boolean> {
  const [featureToggles, { permissions }] = await Promise.all([
    queryClient.query({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    }),
    // An admin may have changed the grant in another session since the
    // permissions were cached.
    queryClient.query({
      ...getMyPermissionsControllerGetMineQueryOptions(),
      staleTime: 0,
    }),
  ]);
  return (
    featureToggles.routinesEnabled &&
    createAuthorization(user.role, permissions).can('manage_routines')
  );
}
