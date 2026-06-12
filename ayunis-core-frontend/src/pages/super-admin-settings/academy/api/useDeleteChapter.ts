import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyChaptersControllerDeleteChapter,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';

export function useDeleteChapter() {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminAcademyChaptersControllerDeleteChapter({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
        });
        showSuccess(t('toast.chapterDeleteSuccess'));
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'CHAPTER_NOT_FOUND') {
            showError(t('toast.chapterNotFound'));
          } else {
            showError(t('toast.chapterDeleteError'));
          }
        } catch {
          showError(t('toast.chapterDeleteError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function deleteChapter(id: string) {
    mutation.mutate({ id });
  }

  return {
    deleteChapter,
    isDeleting: mutation.isPending,
  };
}
