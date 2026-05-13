import {
  useBrandingControllerGet,
  getBrandingControllerGetQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

const BRANDING_STALE_TIME_MS = 5 * 60 * 1000;

export function useBranding() {
  const { data, isLoading, error } = useBrandingControllerGet({
    query: {
      queryKey: getBrandingControllerGetQueryKey(),
      staleTime: BRANDING_STALE_TIME_MS,
    },
  });

  return {
    branding: data,
    isLoading,
    error,
  };
}
