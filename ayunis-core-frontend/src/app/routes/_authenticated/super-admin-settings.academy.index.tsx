import { createFileRoute } from '@tanstack/react-router';
import AcademyPage from '@/pages/super-admin-settings/academy';
import {
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
  superAdminAcademyChaptersControllerGetChapters,
} from '@/shared/api';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/academy/',
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    return {
      chapters: await queryClient.fetchQuery({
        queryKey: getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
        queryFn: () => superAdminAcademyChaptersControllerGetChapters(),
      }),
    };
  },
});

function RouteComponent() {
  const { chapters } = Route.useLoaderData();
  return <AcademyPage chapters={chapters} />;
}
