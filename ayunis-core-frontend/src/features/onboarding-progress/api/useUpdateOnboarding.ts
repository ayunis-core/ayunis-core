import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  userOnboardingControllerUpdateUserOnboarding,
  getAuthenticationControllerMeQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { UpdateUserOnboardingDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

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
    onError: (error) => {
      // The onboarding write has no field-specific error codes worth mapping;
      // extractErrorData still narrows Axios vs. non-Axios failures, but every
      // outcome shows the same generic retry message.
      try {
        extractErrorData(error);
      } catch {
        // Non-Axios error (network failure, cancellation) — falls through.
      }
      showError(t('saveError'));
    },
  });

  return {
    updateOnboarding: (data: UpdateUserOnboardingDto) => mutation.mutate(data),
    isLoading: mutation.isPending,
  };
}
