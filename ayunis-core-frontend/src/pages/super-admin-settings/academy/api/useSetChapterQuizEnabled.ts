import { useRef } from 'react';
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

  // A threshold blur and a switch toggle can fire in the same gesture as two
  // concurrent updates with no ordering guarantee. Serialize them so the
  // later user action always wins; errors surface via onError above.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  function enqueueUpdate(
    variables: Parameters<typeof mutation.mutateAsync>[0],
  ) {
    queueRef.current = queueRef.current
      .then(() => mutation.mutateAsync(variables))
      .catch(() => undefined);
  }

  function setQuizEnabled(
    chapter: SuperAdminAcademyChapterResponseDto,
    quizEnabled: boolean,
  ) {
    enqueueUpdate({
      id: chapter.id,
      data: {
        title: chapter.title,
        description: chapter.description,
        quizEnabled,
      },
    });
  }

  function setPassThreshold(
    chapter: SuperAdminAcademyChapterResponseDto,
    passThreshold: number,
  ) {
    enqueueUpdate({
      id: chapter.id,
      data: {
        title: chapter.title,
        description: chapter.description,
        // quizEnabled is deliberately omitted (backend keeps the current
        // value), so a threshold update can never replay a stale toggle.
        passThreshold,
      },
    });
  }

  return {
    setQuizEnabled,
    setPassThreshold,
    isSettingQuiz: mutation.isPending,
  };
}
