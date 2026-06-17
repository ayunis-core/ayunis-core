import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import {
  useSuperAdminPlatformConfigControllerSetImageFairUseLimit,
  getSuperAdminPlatformConfigControllerGetFairUseLimitsQueryKey,
} from '@/shared/api';
import { windowHoursToMs } from './fair-use-limits-conversion';

export interface SetImageFairUseLimitInput {
  limit: number;
  windowHours: number;
}

interface UseSetImageFairUseLimitOptions {
  onSuccessCallback?: () => void;
}

const SET_IMAGE_FAIR_USE_LIMIT_ERROR_MAP: Record<string, string> = {
  PLATFORM_CONFIG_INVALID_VALUE: 'imageFairUseLimit.updateError',
};

export default function useSetImageFairUseLimit(
  options?: UseSetImageFairUseLimitOptions,
) {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const queryClient = useQueryClient();

  const { mutate, isPending } =
    useSuperAdminPlatformConfigControllerSetImageFairUseLimit({
      mutation: {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey:
              getSuperAdminPlatformConfigControllerGetFairUseLimitsQueryKey(),
          });
          showSuccess(t('imageFairUseLimit.updateSuccess'));
          options?.onSuccessCallback?.();
        },
        onError: (error: unknown) => {
          try {
            const { code } = extractErrorData(error);
            const mappedKey = SET_IMAGE_FAIR_USE_LIMIT_ERROR_MAP[code];
            if (mappedKey) {
              showError(t(mappedKey));
            } else {
              showError(t('imageFairUseLimit.updateError'));
            }
          } catch {
            showError(t('imageFairUseLimit.updateError'));
          }
        },
      },
    });

  function setImageFairUseLimit(input: SetImageFairUseLimitInput) {
    const windowMs = windowHoursToMs(input.windowHours);
    if (windowMs < 1) {
      throw new Error(
        `windowHours=${input.windowHours} rounds to windowMs=${windowMs}, which is below the backend minimum of 1`,
      );
    }

    mutate({
      data: {
        limit: input.limit,
        windowMs,
      },
    });
  }

  return { mutate: setImageFairUseLimit, isPending };
}
