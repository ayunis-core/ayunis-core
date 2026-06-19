import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  onboardingControllerUpdateOnboarding,
  getOnboardingControllerGetOnboardingQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { UpdateOnboardingDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError } from '@/shared/lib/toast';

/**
 * Persists onboarding progress (completed step IDs + hidden flag). The backend
 * is a dumb store — all onboarding logic lives on the frontend. Invalidates the
 * onboarding query so consumers re-read the fresh state.
 */
export function useUpdateOnboarding() {
  const { t } = useTranslation('getting-started');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: UpdateOnboardingDto) => {
      return await onboardingControllerUpdateOnboarding(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getOnboardingControllerGetOnboardingQueryKey(),
      });
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
