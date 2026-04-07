import { useSuperAdminPlatformConfigControllerGetFairUseLimits } from '@/shared/api';
import { windowMsToHours } from './fair-use-limits-conversion';

export interface FairUseTierLimit {
  limit: number;
  windowHours: number;
}

export default function useFairUseLimits() {
  const { data, isLoading, isError } =
    useSuperAdminPlatformConfigControllerGetFairUseLimits();

  const low: FairUseTierLimit | undefined = data
    ? { limit: data.low.limit, windowHours: windowMsToHours(data.low.windowMs) }
    : undefined;
  const medium: FairUseTierLimit | undefined = data
    ? {
        limit: data.medium.limit,
        windowHours: windowMsToHours(data.medium.windowMs),
      }
    : undefined;
  const high: FairUseTierLimit | undefined = data
    ? {
        limit: data.high.limit,
        windowHours: windowMsToHours(data.high.windowMs),
      }
    : undefined;

  return {
    low,
    medium,
    high,
    isLoading,
    isError,
  };
}
