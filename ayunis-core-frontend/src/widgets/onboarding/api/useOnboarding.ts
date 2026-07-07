import {
  useOnboardingControllerGetOnboarding,
  getOnboardingControllerGetOnboardingQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

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
