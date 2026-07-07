import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  onboardingControllerUpdateOnboarding,
  getOnboardingControllerGetOnboardingQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError } from '@/shared/lib/toast';

export function useHideOnboarding() {
  const { t } = useTranslation('getting-started');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (completedStepIds: string[]) => {
      return await onboardingControllerUpdateOnboarding({
        completedStepIds,
        hidden: true,
      });
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
    hideOnboarding: (completedStepIds: string[]) =>
      mutation.mutate(completedStepIds),
    isLoading: mutation.isPending,
  };
}
