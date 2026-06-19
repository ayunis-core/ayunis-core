import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  userOnboardingControllerUpdateUserOnboarding,
  getAuthenticationControllerMeQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { UpdateUserOnboardingDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError } from '@/shared/lib/toast';

/**
 * Persists onboarding progress (completed step IDs + hidden flag) on the user
 * record. The backend is a dumb store — all onboarding logic lives on the
 * frontend. Invalidates the `/me` query so consumers re-read the fresh state.
 */
export function useUpdateOnboarding() {
  const { t } = useTranslation('getting-started');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: UpdateUserOnboardingDto) => {
      return await userOnboardingControllerUpdateUserOnboarding(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getAuthenticationControllerMeQueryKey(),
      });
    },
    onError: () => {
      showError(t('saveError'));
    },
  });

  return {
    updateOnboarding: (data: UpdateUserOnboardingDto) => mutation.mutate(data),
    isLoading: mutation.isPending,
  };
}
