import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  onboardingControllerUpdateOnboarding,
  getOnboardingControllerGetOnboardingQueryKey,
} from '@ayunis/api-client/endpoints';
import type {
  OnboardingResponseDto,
  UpdateOnboardingDto,
} from '@ayunis/api-client/schemas';
import { showError } from '@/shared/lib/toast';
import { trackOnboardingChanges } from '@/widgets/onboarding';

export function useUpdateOnboarding() {
  const { t } = useTranslation('getting-started');
  const queryClient = useQueryClient();
  const queryKey = getOnboardingControllerGetOnboardingQueryKey();

  const mutation = useMutation({
    mutationFn: async (data: UpdateOnboardingDto) => {
      return await onboardingControllerUpdateOnboarding(data);
    },
    onMutate: () => queryClient.getQueryData<OnboardingResponseDto>(queryKey),
    onSuccess: (saved, _data, previous) => {
      if (previous) trackOnboardingChanges(previous, saved);
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      showError(t('saveError'));
    },
  });

  return {
    updateOnboarding: (data: UpdateOnboardingDto) => mutation.mutate(data),
    isLoading: mutation.isPending,
  };
}
