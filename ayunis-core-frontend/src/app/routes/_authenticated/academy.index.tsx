import { createFileRoute, redirect } from '@tanstack/react-router';
import { AcademyPage } from '@/pages/academy';
import { isAcademyAddonActive } from '@/features/academy';
import {
  addonsControllerList,
  getAddonsControllerListQueryKey,
  academyChaptersControllerGetChapters,
  getAcademyChaptersControllerGetChaptersQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/academy/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const addons = await queryClient.fetchQuery({
      queryKey: getAddonsControllerListQueryKey(),
      queryFn: () => addonsControllerList(),
    });
    if (!isAcademyAddonActive(addons)) {
      throw redirect({ to: '/chat' });
    }
    const chapters = await queryClient.fetchQuery({
      queryKey: getAcademyChaptersControllerGetChaptersQueryKey(),
      queryFn: () => academyChaptersControllerGetChapters(),
    });
    return { chapters };
  },
});

function RouteComponent() {
  const { chapters } = Route.useLoaderData();
  return <AcademyPage chapters={chapters} />;
}
