import { useSuperAdminPlatformConfigControllerGetFairUseLimits } from '@/shared/api';
import { windowMsToHours } from './fair-use-limits-conversion';

export interface FairUseTierLimit {
  limit: number;
  windowHours: number;
}

export default function useFairUseLimits() {
  const { data, isLoading, isError } =
    useSuperAdminPlatformConfigControllerGetFairUseLimits();

  const zero: FairUseTierLimit | undefined = data
    ? {
        limit: data.zero.limit,
        windowHours: windowMsToHours(data.zero.windowMs),
      }
    : undefined;
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
    zero,
    low,
    medium,
    high,
    isLoading,
    isError,
  };
}
