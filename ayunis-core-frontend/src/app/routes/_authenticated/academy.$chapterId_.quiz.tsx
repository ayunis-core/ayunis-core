import { createFileRoute, redirect } from '@tanstack/react-router';
import { ChapterQuizPage } from '@/pages/academy-chapter-quiz';
import { isAcademyAddonActive } from '@/features/academy';
import {
  addonsControllerList,
  getAddonsControllerListQueryKey,
  academyChaptersControllerGetChapters,
  getAcademyChaptersControllerGetChaptersQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute(
  '/_authenticated/academy/$chapterId_/quiz',
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { chapterId } }) => {
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
    const chapter = chapters.find((c) => c.id === chapterId);
    // No quiz here → send the learner back to the chapter.
    if (!chapter?.quizEnabled) {
      throw redirect({
        to: '/academy/$chapterId',
        params: { chapterId },
        search: {},
      });
    }
    return { chapter };
  },
});

function RouteComponent() {
  const { chapter } = Route.useLoaderData();
  return <ChapterQuizPage chapter={chapter} />;
}
