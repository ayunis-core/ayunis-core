import { createFileRoute, redirect } from '@tanstack/react-router';
import { RoutinesPage } from '@/pages/routines';
import { createAuthorization } from '@/features/permissions';
import {
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
  getMyPermissionsControllerGetMineQueryOptions,
  getRoutinesControllerFindAllQueryKey,
  routinesControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/routines/')({
  component: RoutinesPage,
  loader: async ({ context: { queryClient, user } }) => {
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
    if (
      !featureToggles.routinesEnabled ||
      !createAuthorization(user.role, permissions).can('manage_routines')
    ) {
      throw redirect({ to: '/chat' });
    }
    await queryClient.query({
      queryKey: getRoutinesControllerFindAllQueryKey(),
      queryFn: () => routinesControllerFindAll(),
    });
  },
});
