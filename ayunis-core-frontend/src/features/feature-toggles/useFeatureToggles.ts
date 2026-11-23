import { useAppControllerFeatureToggles } from '@ayunis/api-client/endpoints';

export function useFeatureToggles() {
  const { data, isLoading, error, refetch } = useAppControllerFeatureToggles();
  return { toggles: error ? undefined : data, isLoading, error, refetch };
}
