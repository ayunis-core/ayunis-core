import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useOnboardingControllerGetOnboarding,
  getOnboardingControllerGetOnboardingQueryKey,
  onboardingControllerMarkWelcomeVideoSeen,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { trackOpenPanelEvent } from '@/shared/lib/openpanel-events';
import { showError } from '@/shared/lib/toast';

export function useWelcomeVideo() {
  const { t } = useTranslation('welcome-video');
  const queryClient = useQueryClient();
  const queryKey = getOnboardingControllerGetOnboardingQueryKey();
  const { data, isLoading } = useOnboardingControllerGetOnboarding({
    query: { queryKey },
  });

  const seen = data ? data.welcomeVideoSeenAt !== null : true;

  const mutation = useMutation({
    mutationFn: async () => {
      return onboardingControllerMarkWelcomeVideoSeen();
    },
    onSuccess: () => {
      trackOpenPanelEvent('welcome_video_seen');
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'ONBOARDING_UNEXPECTED_ERROR') {
          showError(t('saveUnexpectedError'));
          return;
        }
        showError(t('saveError'));
      } catch {
        showError(t('saveError'));
      }
    },
  });

  const markSeen = async () => {
    if (seen || !data) {
      return;
    }
    await mutation.mutateAsync();
  };

  return { seen, isLoading, isSaving: mutation.isPending, markSeen };
}
