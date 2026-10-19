import { useAppControllerFeatureToggles } from '@/shared/api/generated/ayunisCoreAPI';

export function useFeatureToggles() {
  const { data, isLoading, error, refetch } = useAppControllerFeatureToggles();
  return { toggles: error ? undefined : data, isLoading, error, refetch };
}
