import { createFileRoute, redirect } from '@tanstack/react-router';
import AcademyPage from '@/pages/super-admin-settings/academy';
import { MeResponseDtoSystemRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
  superAdminAcademyChaptersControllerGetChapters,
} from '@/shared/api';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/academy/',
)({
  component: RouteComponent,
  beforeLoad: ({ context: { user } }) => {
    if (user.systemRole !== MeResponseDtoSystemRole.super_admin) {
      throw redirect({ to: '/' });
    }
  },
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
