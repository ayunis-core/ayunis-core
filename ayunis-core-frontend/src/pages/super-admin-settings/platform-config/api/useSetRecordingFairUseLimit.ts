import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import {
  useSuperAdminPlatformConfigControllerSetRecordingFairUseLimit,
  getSuperAdminPlatformConfigControllerGetFairUseLimitsQueryKey,
} from '@/shared/api';
import { windowHoursToMs } from './fair-use-limits-conversion';
import type { FairUseTierLimit } from './useFairUseLimits';

interface UseSetRecordingFairUseLimitOptions {
  onSuccessCallback?: () => void;
}

export default function useSetRecordingFairUseLimit(
  options?: UseSetRecordingFairUseLimitOptions,
) {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const queryClient = useQueryClient();

  const { mutate, isPending } =
    useSuperAdminPlatformConfigControllerSetRecordingFairUseLimit({
      mutation: {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey:
              getSuperAdminPlatformConfigControllerGetFairUseLimitsQueryKey(),
          });
          showSuccess(t('recordingFairUseLimit.updateSuccess'));
          options?.onSuccessCallback?.();
        },
        onError: () => {
          showError(t('recordingFairUseLimit.updateError'));
        },
      },
    });

  function setRecordingFairUseLimit(input: FairUseTierLimit) {
    const windowMs = windowHoursToMs(input.windowHours);
    if (windowMs < 1) {
      throw new Error(
        `windowHours=${input.windowHours} rounds to windowMs=${windowMs}, which is below the backend minimum of 1`,
      );
    }

    mutate({ data: { limit: input.limit, windowMs } });
  }

  return { mutate: setRecordingFairUseLimit, isPending };
}
