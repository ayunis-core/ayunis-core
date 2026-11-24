import { queryOptions, useQuery } from '@tanstack/react-query';
import {
  getOnboardingControllerGetOnboardingStageQueryKey,
  onboardingControllerGetOnboardingStage,
} from '@ayunis/api-client/endpoints';

/**
 * The route loader fetches the stage on every visit, so the hint never shows
 * a stage the user has already completed and doesn't pop in after the page.
 */
export function onboardingStageQueryOptions() {
  return queryOptions({
    queryKey: getOnboardingControllerGetOnboardingStageQueryKey(),
    queryFn: ({ signal }) => onboardingControllerGetOnboardingStage(signal),
  });
}

export function useOnboardingStage(enabled: boolean) {
  const { data, isError } = useQuery({
    ...onboardingStageQueryOptions(),
    enabled,
  });
  // A failed refetch keeps the previous data, which may be a stage the user
  // has completed since.
  return isError ? undefined : data;
}
