import {
  useOnboardingControllerGetOnboarding,
  getOnboardingControllerGetOnboardingQueryKey,
} from '@ayunis/api-client/endpoints';

export function useOnboarding() {
  const { data, dataUpdatedAt, isLoading, error } =
    useOnboardingControllerGetOnboarding({
      query: {
        queryKey: getOnboardingControllerGetOnboardingQueryKey(),
      },
    });

  return {
    completedStepIds: data?.completedStepIds ?? [],
    hidden: data?.hidden ?? false,
    fetchedAt: dataUpdatedAt,
    isLoading,
    error,
  };
}
