import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyQuizQuestionsControllerDeleteQuizQuestion,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';

export function useDeleteQuestion() {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation =
    useSuperAdminAcademyQuizQuestionsControllerDeleteQuizQuestion({
      mutation: {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey:
              getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
          });
          showSuccess(t('toast.questionDeleteSuccess'));
        },
        onError: (error: unknown) => {
          try {
            const { code } = extractErrorData(error);
            if (code === 'QUIZ_QUESTION_NOT_FOUND') {
              showError(t('toast.questionNotFound'));
            } else {
              showError(t('toast.questionDeleteError'));
            }
          } catch {
            showError(t('toast.questionDeleteError'));
          }
        },
        onSettled: async () => {
          await router.invalidate();
        },
      },
    });

  function deleteQuestion(id: string) {
    mutation.mutate({ id });
  }

  return {
    deleteQuestion,
    isDeleting: mutation.isPending,
  };
}
