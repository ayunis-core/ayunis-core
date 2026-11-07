import { createFileRoute, redirect } from '@tanstack/react-router';
import { RoutinesPage } from '@/pages/routines';
import {
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
  getRoutinesControllerFindAllQueryKey,
  routinesControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/routines/')({
  component: RoutinesPage,
  loader: async ({ context: { queryClient } }) => {
    const featureToggles = await queryClient.query({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    });
    if (!featureToggles.routinesEnabled) {
      throw redirect({ to: '/chat' });
    }
    await queryClient.query({
      queryKey: getRoutinesControllerFindAllQueryKey(),
      queryFn: () => routinesControllerFindAll(),
    });
  },
});
