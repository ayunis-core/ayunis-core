import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useOnboardingControllerGetOnboarding,
  getOnboardingControllerGetOnboardingQueryKey,
  onboardingControllerUpdateOnboarding,
} from '@/shared/api/generated/ayunisCoreAPI';

const WELCOME_VIDEO_STEP_ID = 'welcome-video';

export function useWelcomeVideo() {
  const queryClient = useQueryClient();
  const queryKey = getOnboardingControllerGetOnboardingQueryKey();
  const { data, isLoading } = useOnboardingControllerGetOnboarding({
    query: { queryKey },
  });

  const completedStepIds = data?.completedStepIds ?? [];
  const hidden = data?.hidden ?? false;
  const seen = completedStepIds.includes(WELCOME_VIDEO_STEP_ID);

  const mutation = useMutation({
    mutationFn: async () =>
      onboardingControllerUpdateOnboarding({
        completedStepIds: [...completedStepIds, WELCOME_VIDEO_STEP_ID],
        hidden,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const markSeen = () => {
    if (seen) {
      return;
    }
    mutation.mutate();
  };

  return { seen, isLoading, markSeen };
}
