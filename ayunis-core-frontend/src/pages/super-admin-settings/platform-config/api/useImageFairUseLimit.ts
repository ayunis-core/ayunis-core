import { useSuperAdminPlatformConfigControllerGetFairUseLimits } from '@/shared/api';
import { windowMsToHours } from './fair-use-limits-conversion';
import type { FairUseTierLimit } from './useFairUseLimits';

export default function useImageFairUseLimit() {
  const { data, isLoading, isError } =
    useSuperAdminPlatformConfigControllerGetFairUseLimits();

  const images: FairUseTierLimit | undefined = data
    ? {
        limit: data.images.limit,
        windowHours: windowMsToHours(data.images.windowMs),
      }
    : undefined;

  return {
    images,
    isLoading,
    isError,
  };
}
