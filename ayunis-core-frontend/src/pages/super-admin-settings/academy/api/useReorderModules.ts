import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyCourseModulesControllerReorderCourseModules,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';

export function useReorderModules() {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation =
    useSuperAdminAcademyCourseModulesControllerReorderCourseModules({
      mutation: {
        // Serialize reorder requests so a slower earlier request cannot finish
        // after a newer one and overwrite the latest order on the server.
        scope: { id: 'reorder-academy-modules' },
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey:
              getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
          });
        },
        onError: (error: unknown) => {
          try {
            const { code } = extractErrorData(error);
            if (code === 'CHAPTER_NOT_FOUND') {
              showError(t('toast.chapterNotFound'));
            } else {
              showError(t('toast.reorderError'));
            }
          } catch {
            showError(t('toast.reorderError'));
          }
          // Re-sync the optimistic local order with the server state
          void queryClient.invalidateQueries({
            queryKey:
              getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
          });
        },
        onSettled: async () => {
          await router.invalidate();
        },
      },
    });

  function reorderModules(chapterId: string, moduleIds: string[]) {
    mutation.mutate({ chapterId, data: { courseModuleIds: moduleIds } });
  }

  return {
    reorderModules,
    isReordering: mutation.isPending,
  };
}
