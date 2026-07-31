import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';
import {
  useAcademyQuizControllerSubmitChapterQuiz,
  getAcademyQuizControllerGetProgressQueryKey,
  getAcademyChaptersControllerGetChaptersQueryKey,
  getAcademyAccessControllerGetStatusQueryKey,
  type SubmitQuizRequestDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';

export function useSubmitChapterQuiz() {
  const { t } = useTranslation('academy');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useAcademyQuizControllerSubmitChapterQuiz({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getAcademyQuizControllerGetProgressQueryKey(),
        });
        await queryClient.invalidateQueries({
          queryKey: getAcademyChaptersControllerGetChaptersQueryKey(),
        });
        // Passing the last chapter has to unlock chat immediately. router
        // .invalidate() alone re-runs loaders against a still-fresh cache
        // entry, so the gate would stay closed for the query's staleTime.
        await queryClient.invalidateQueries({
          queryKey: getAcademyAccessControllerGetStatusQueryKey(),
        });
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'QUIZ_NOT_AVAILABLE') {
            showError(t('quiz.errors.notAvailable'));
          } else if (code === 'INVALID_QUIZ_SUBMISSION') {
            showError(t('quiz.errors.invalidSubmission'));
          } else {
            showError(t('quiz.errors.submitFailed'));
          }
        } catch {
          showError(t('quiz.errors.submitFailed'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function submitQuiz(chapterId: string, data: SubmitQuizRequestDto) {
    mutation.mutate({ chapterId, data });
  }

  return {
    submitQuiz,
    isSubmitting: mutation.isPending,
    result: mutation.data,
    reset: mutation.reset,
  };
}
