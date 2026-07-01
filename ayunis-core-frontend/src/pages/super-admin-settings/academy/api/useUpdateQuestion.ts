import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyQuizQuestionsControllerUpdateQuizQuestion,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
  type UpdateQuizQuestionRequestDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import type { QuestionFormValues } from '../model/questionFormSchema';

export function useUpdateQuestion(
  form: UseFormReturn<QuestionFormValues>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation =
    useSuperAdminAcademyQuizQuestionsControllerUpdateQuizQuestion({
      mutation: {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey:
              getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
          });
          showSuccess(t('toast.questionUpdateSuccess'));
          onSuccess?.();
        },
        onError: (error: unknown) => {
          try {
            const { code, errors } = extractErrorData(error);
            if (code === 'VALIDATION_ERROR' && errors) {
              setValidationErrors(form, errors, t, 'validation');
            } else if (code === 'QUIZ_QUESTION_NOT_FOUND') {
              showError(t('toast.questionNotFound'));
            } else if (code === 'INVALID_QUIZ_QUESTION') {
              showError(t('toast.questionInvalid'));
            } else {
              showError(t('toast.questionUpdateError'));
            }
          } catch {
            showError(t('toast.questionUpdateError'));
          }
        },
        onSettled: async () => {
          await router.invalidate();
        },
      },
    });

  function updateQuestion(id: string, data: UpdateQuizQuestionRequestDto) {
    mutation.mutate({ id, data });
  }

  return {
    updateQuestion,
    isUpdating: mutation.isPending,
  };
}
