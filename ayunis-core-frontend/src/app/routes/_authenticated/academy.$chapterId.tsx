import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { ChapterDetailPage } from '@/pages/academy';
import { isAcademyAddonActive } from '@/features/academy';
import {
  addonsControllerList,
  getAddonsControllerListQueryKey,
  academyChaptersControllerGetChapters,
  getAcademyChaptersControllerGetChaptersQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

const searchSchema = z.object({
  // Any empty/invalid value falls back to undefined → chapter intro screen.
  lesson: z.number().int().min(0).optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/academy/$chapterId')({
  component: RouteComponent,
  validateSearch: searchSchema,
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
    if (!chapter) {
      throw redirect({ to: '/academy' });
    }
    return { chapter };
  },
});

function RouteComponent() {
  const { chapter } = Route.useLoaderData();
  const { lesson } = Route.useSearch();
  return <ChapterDetailPage chapter={chapter} activeLesson={lesson} />;
}
