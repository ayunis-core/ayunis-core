import {
  useOnboardingControllerGetOnboarding,
  getOnboardingControllerGetOnboardingQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

/**
 * Reads the current user's onboarding progress (completed step IDs + hidden
 * flag) from its dedicated endpoint. The backend is a dumb store — all
 * onboarding logic lives on the frontend.
 */
export function useOnboarding() {
  const { data, isLoading, error } = useOnboardingControllerGetOnboarding({
    query: {
      queryKey: getOnboardingControllerGetOnboardingQueryKey(),
    },
  });

  return {
    completedStepIds: data?.completedStepIds ?? [],
    hidden: data?.hidden ?? false,
    isLoading,
    error,
  };
}
