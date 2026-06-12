import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyLessonsControllerReorderLessons,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';

export function useReorderLessons() {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminAcademyLessonsControllerReorderLessons({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
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
          queryKey: getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
        });
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function reorderLessons(chapterId: string, lessonIds: string[]) {
    mutation.mutate({ chapterId, data: { lessonIds } });
  }

  return {
    reorderLessons,
    isReordering: mutation.isPending,
  };
}
