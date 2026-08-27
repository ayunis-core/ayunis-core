import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  academyChaptersControllerConfirmChapter,
  getAcademyAccessControllerGetStatusQueryKey,
  getAcademyProgressControllerGetProgressQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

export function useConfirmChapter(chapterId: string) {
  const { t } = useTranslation('academy');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: () => academyChaptersControllerConfirmChapter(chapterId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getAcademyProgressControllerGetProgressQueryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: getAcademyAccessControllerGetStatusQueryKey(),
        }),
      ]);
      await router.invalidate();
      await navigate({ to: '/academy' });
    },
    onError: (error: unknown) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'CHAPTER_NOT_FOUND') {
          showError(t('confirmation.errors.chapterNotFound'));
        } else {
          showError(t('confirmation.errors.submitFailed'));
        }
      } catch {
        showError(t('confirmation.errors.submitFailed'));
      }
    },
  });

  return {
    confirmChapter: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
  };
}
