import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  onboardingControllerUpdateOnboarding,
  getOnboardingControllerGetOnboardingQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { OnboardingResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError } from '@/shared/lib/toast';
import { trackOnboardingChanges } from '@/widgets/onboarding';

export function useHideOnboarding() {
  const { t } = useTranslation('getting-started');
  const queryClient = useQueryClient();
  const queryKey = getOnboardingControllerGetOnboardingQueryKey();

  const mutation = useMutation({
    mutationFn: async (completedStepIds: string[]) => {
      return await onboardingControllerUpdateOnboarding({
        completedStepIds,
        hidden: true,
      });
    },
    onMutate: () => queryClient.getQueryData<OnboardingResponseDto>(queryKey),
    onSuccess: (saved, _completedStepIds, previous) => {
      if (previous) trackOnboardingChanges(previous, saved);
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      showError(t('saveError'));
    },
  });

  return {
    hideOnboarding: (completedStepIds: string[]) =>
      mutation.mutate(completedStepIds),
    isLoading: mutation.isPending,
  };
}
