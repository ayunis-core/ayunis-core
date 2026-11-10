import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { ChapterDetailPage } from '@/pages/academy-chapter';
import {
  getChapterModuleProgress,
  isAcademyAddonActive,
} from '@/features/academy';
import {
  academyProgressControllerGetProgress,
  getAcademyProgressControllerGetProgressQueryKey,
  addonsControllerList,
  getAddonsControllerListQueryKey,
  academyChaptersControllerGetChapters,
  getAcademyChaptersControllerGetChaptersQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

const searchSchema = z.object({
  module: z.number().int().min(0).optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/academy/$chapterId')({
  component: RouteComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { module } }) => ({ module }),
  loader: async ({
    context: { queryClient },
    params: { chapterId },
    deps: { module },
  }) => {
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
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) {
      throw redirect({ to: '/academy' });
    }
    const moduleCount = chapter.courseModules.length;
    const hasActiveModule = module !== undefined && module < moduleCount;
    if (!hasActiveModule && moduleCount > 0) {
      const progress = await queryClient.query({
        queryKey: getAcademyProgressControllerGetProgressQueryKey(),
        queryFn: () => academyProgressControllerGetProgress(),
      });
      throw redirect({
        to: '/academy/$chapterId',
        params: { chapterId },
        search: {
          module:
            getChapterModuleProgress(chapter, progress).nextModule?.index ?? 0,
        },
        replace: true,
      });
    }
    return { chapter };
  },
});

function RouteComponent() {
  const { chapter } = Route.useLoaderData();
  const { module } = Route.useSearch();
  return <ChapterDetailPage chapter={chapter} activeModule={module} />;
}
