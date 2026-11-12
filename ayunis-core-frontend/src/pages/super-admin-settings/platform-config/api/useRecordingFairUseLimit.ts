import { useSuperAdminPlatformConfigControllerGetFairUseLimits } from '@/shared/api';
import { windowMsToHours } from './fair-use-limits-conversion';
import type { FairUseTierLimit } from './useFairUseLimits';

export default function useRecordingFairUseLimit() {
  const { data, isLoading, isError } =
    useSuperAdminPlatformConfigControllerGetFairUseLimits();

  const recordings: FairUseTierLimit | undefined = data
    ? {
        limit: data.recordings.limit,
        windowHours: windowMsToHours(data.recordings.windowMs),
      }
    : undefined;

  return { recordings, isLoading, isError };
}
