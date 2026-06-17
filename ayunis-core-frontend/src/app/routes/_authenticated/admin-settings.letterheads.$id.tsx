import { createFileRoute, redirect } from '@tanstack/react-router';
import { LetterheadDetailPage } from '@/pages/admin-settings/letterhead-detail';
import {
  letterheadsControllerFindOne,
  getLetterheadsControllerFindOneQueryKey,
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/letterheads/$id',
)({
  component: RouteComponent,
  loader: async ({ params: { id }, context: { queryClient } }) => {
    const featureToggles = await queryClient.fetchQuery({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    });
    if (!featureToggles.letterheadsEnabled) {
      throw redirect({ to: '/admin-settings' });
    }
    const letterhead = await queryClient.fetchQuery({
      queryKey: getLetterheadsControllerFindOneQueryKey(id),
      queryFn: () => letterheadsControllerFindOne(id),
    });
    return { letterhead };
  },
});

function RouteComponent() {
  const { letterhead } = Route.useLoaderData();
  return <LetterheadDetailPage letterhead={letterhead} />;
}
