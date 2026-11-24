import { createFileRoute } from '@tanstack/react-router';
import { LetterheadDetailPage } from '@/pages/admin-settings/letterhead-detail';
import {
  letterheadsControllerFindOne,
  getLetterheadsControllerFindOneQueryKey,
} from '@ayunis/api-client/endpoints';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/letterheads/$id',
)({
  component: RouteComponent,
  loader: async ({ params: { id }, context: { queryClient } }) => {
    const letterhead = await queryClient.query({
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
