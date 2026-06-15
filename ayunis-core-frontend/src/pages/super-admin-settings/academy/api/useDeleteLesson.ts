import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyLessonsControllerDeleteLesson,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';

export function useDeleteLesson() {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const mutation = useSuperAdminAcademyLessonsControllerDeleteLesson({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
        });
        showSuccess(t('toast.lessonDeleteSuccess'));
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'LESSON_NOT_FOUND') {
            showError(t('toast.lessonNotFound'));
          } else {
            showError(t('toast.lessonDeleteError'));
          }
        } catch {
          showError(t('toast.lessonDeleteError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function deleteLesson(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    mutation.mutate(
      { id },
      {
        onSettled: () => {
          setDeletingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      },
    );
  }

  return {
    deleteLesson,
    deletingIds,
  };
}
