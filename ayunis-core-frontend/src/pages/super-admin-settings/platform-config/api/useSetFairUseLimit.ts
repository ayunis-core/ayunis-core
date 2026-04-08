import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import {
  useSuperAdminPlatformConfigControllerSetFairUseLimit,
  getSuperAdminPlatformConfigControllerGetFairUseLimitsQueryKey,
  type SetFairUseLimitRequestDtoTier,
} from '@/shared/api';
import { windowHoursToMs } from './fair-use-limits-conversion';

export interface SetFairUseLimitInput {
  tier: SetFairUseLimitRequestDtoTier;
  limit: number;
  windowHours: number;
}

interface UseSetFairUseLimitOptions {
  onSuccessCallback?: () => void;
}

const SET_FAIR_USE_LIMIT_ERROR_MAP: Record<string, string> = {
  PLATFORM_CONFIG_INVALID_VALUE: 'fairUseLimits.updateError',
};

export default function useSetFairUseLimit(
  options?: UseSetFairUseLimitOptions,
) {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const queryClient = useQueryClient();

  const { mutate, isPending } =
    useSuperAdminPlatformConfigControllerSetFairUseLimit({
      mutation: {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey:
              getSuperAdminPlatformConfigControllerGetFairUseLimitsQueryKey(),
          });
          showSuccess(t('fairUseLimits.updateSuccess'));
          options?.onSuccessCallback?.();
        },
        onError: (error: unknown) => {
          try {
            const { code } = extractErrorData(error);
            const mappedKey = SET_FAIR_USE_LIMIT_ERROR_MAP[code];
            if (mappedKey) {
              showError(t(mappedKey));
            } else {
              showError(t('fairUseLimits.updateError'));
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t('fairUseLimits.updateError'));
          }
        },
      },
    });

  function setFairUseLimit(input: SetFairUseLimitInput) {
    const windowMs = windowHoursToMs(input.windowHours);
    // Belt-and-suspenders: the UI validator already enforces
    // `windowHours >= 0.01`, but a sub-bound value would round to 0 here and
    // get rejected by the backend's `@IsInt() @Min(1)` with an opaque 400.
    // Fail loudly client-side instead.
    if (windowMs < 1) {
      showError(t('fairUseLimits.validationError.windowHours'));
      return;
    }

    mutate({
      data: {
        tier: input.tier,
        limit: input.limit,
        windowMs,
      },
    });
  }

  return { mutate: setFairUseLimit, isPending };
}
