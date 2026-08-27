import { createFileRoute, redirect } from '@tanstack/react-router';
import { ChapterConfirmationPage } from '@/pages/academy-chapter-confirmation';
import { isAcademyAddonActive } from '@/features/academy';
import {
  academyChaptersControllerGetChapters,
  addonsControllerList,
  getAcademyChaptersControllerGetChaptersQueryKey,
  getAddonsControllerListQueryKey,
} from '@/shared/api';

export const Route = createFileRoute(
  '/_authenticated/academy/$chapterId_/complete',
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { chapterId } }) => {
    const addons = await queryClient.fetchQuery({
      queryKey: getAddonsControllerListQueryKey(),
      queryFn: () => addonsControllerList(),
    });
    if (!isAcademyAddonActive(addons)) {
      throw redirect({ to: '/academy' });
    }
    const chapters = await queryClient.fetchQuery({
      queryKey: getAcademyChaptersControllerGetChaptersQueryKey(),
      queryFn: () => academyChaptersControllerGetChapters(),
    });
    const chapter = chapters.find(({ id }) => id === chapterId);
    if (!chapter) {
      throw redirect({ to: '/academy' });
    }
    return { chapter };
  },
});

function RouteComponent() {
  const { chapter } = Route.useLoaderData();
  return <ChapterConfirmationPage chapter={chapter} />;
}
