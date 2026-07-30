import { createFileRoute } from '@tanstack/react-router';
import { AcademyPage, AcademyPlaceholderPage } from '@/pages/academy';
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
    // The academy menu entry is always visible. Non-customers see a landing
    // placeholder instead of the (add-on-gated) content.
    if (!isAcademyAddonActive(addons)) {
      return { active: false as const };
    }
    const chapters = await queryClient.fetchQuery({
      queryKey: getAcademyChaptersControllerGetChaptersQueryKey(),
      queryFn: () => academyChaptersControllerGetChapters(),
    });
    return { active: true as const, chapters };
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();
  if (!data.active) {
    return <AcademyPlaceholderPage />;
  }
  return <AcademyPage chapters={data.chapters} />;
}
