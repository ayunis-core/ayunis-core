import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyQuizQuestionsControllerCreateQuizQuestion,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
  type CreateQuizQuestionRequestDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import type { QuestionFormValues } from '../model/questionFormSchema';

export function useCreateQuestion(
  form: UseFormReturn<QuestionFormValues>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation =
    useSuperAdminAcademyQuizQuestionsControllerCreateQuizQuestion({
      mutation: {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey:
              getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
          });
          showSuccess(t('toast.questionCreateSuccess'));
          onSuccess?.();
        },
        onError: (error: unknown) => {
          try {
            const { code, errors } = extractErrorData(error);
            if (code === 'VALIDATION_ERROR' && errors) {
              setValidationErrors(form, errors, t, 'validation');
            } else if (code === 'CHAPTER_NOT_FOUND') {
              showError(t('toast.chapterNotFound'));
            } else if (code === 'INVALID_QUIZ_QUESTION') {
              showError(t('toast.questionInvalid'));
            } else {
              showError(t('toast.questionCreateError'));
            }
          } catch {
            showError(t('toast.questionCreateError'));
          }
        },
        onSettled: async () => {
          await router.invalidate();
        },
      },
    });

  function createQuestion(
    chapterId: string,
    data: CreateQuizQuestionRequestDto,
  ) {
    mutation.mutate({ chapterId, data });
  }

  return {
    createQuestion,
    isCreating: mutation.isPending,
  };
}
