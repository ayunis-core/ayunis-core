import { createFileRoute, redirect } from '@tanstack/react-router';
import { ChapterConfirmationPage } from '@/pages/academy-chapter-confirmation';
import { isAcademyAddonActive } from '@/features/academy';
import {
  academyChaptersControllerGetChapters,
  academyProgressControllerGetProgress,
  addonsControllerList,
  getAcademyChaptersControllerGetChaptersQueryKey,
  getAcademyProgressControllerGetProgressQueryKey,
  getAddonsControllerListQueryKey,
} from '@/shared/api';
import { findModulesBlockingConfirmation } from '@/pages/academy-chapter-confirmation/lib/findModulesBlockingConfirmation';

export const Route = createFileRoute(
  '/_authenticated/academy/$chapterId_/complete',
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { chapterId } }) => {
    const addons = await queryClient.query({
      queryKey: getAddonsControllerListQueryKey(),
      queryFn: () => addonsControllerList(),
    });
    if (!isAcademyAddonActive(addons)) {
      throw redirect({ to: '/academy' });
    }
    const chapters = await queryClient.query({
      queryKey: getAcademyChaptersControllerGetChaptersQueryKey(),
      queryFn: () => academyChaptersControllerGetChapters(),
    });
    const chapter = chapters.find(({ id }) => id === chapterId);
    if (!chapter) {
      throw redirect({ to: '/academy' });
    }
    const progress = await queryClient.query({
      queryKey: getAcademyProgressControllerGetProgressQueryKey(),
      queryFn: () => academyProgressControllerGetProgress(),
    });
    const firstMissing = findModulesBlockingConfirmation(chapter, progress).at(
      0,
    );
    if (firstMissing) {
      const sortedModules = [...chapter.courseModules].sort(
        (a, b) => a.position - b.position,
      );
      throw redirect({
        to: '/academy/$chapterId',
        params: { chapterId },
        search: { module: sortedModules.indexOf(firstMissing) },
        replace: true,
      });
    }
    return { chapter };
  },
});

function RouteComponent() {
  const { chapter } = Route.useLoaderData();
  return <ChapterConfirmationPage chapter={chapter} />;
}
