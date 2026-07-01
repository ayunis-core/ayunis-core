import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyChaptersControllerUpdateChapter,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
  type SuperAdminAcademyChapterResponseDto,
} from '@/shared/api';

// Toggles the per-chapter quiz activation. Update is a full replace, so the
// current title/description are sent alongside the new quizEnabled flag.
export function useSetChapterQuizEnabled() {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminAcademyChaptersControllerUpdateChapter({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
        });
      },
      onError: () => {
        showError(t('toast.quizToggleError'));
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function setQuizEnabled(
    chapter: SuperAdminAcademyChapterResponseDto,
    quizEnabled: boolean,
  ) {
    mutation.mutate({
      id: chapter.id,
      data: {
        title: chapter.title,
        description: chapter.description,
        quizEnabled,
      },
    });
  }

  return {
    setQuizEnabled,
    isSettingQuiz: mutation.isPending,
  };
}
