import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  brandingControllerUpdate,
  getBrandingControllerGetQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';

interface UpdateBrandingParams {
  displayName?: string;
  favicon?: File;
  removeFavicon?: boolean;
  primaryColor?: string;
  resetPrimaryColor?: boolean;
}

export function useUpdateBranding(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-organization');

  const mutation = useMutation({
    mutationFn: (params: UpdateBrandingParams) =>
      brandingControllerUpdate({
        displayName: params.displayName,
        favicon: params.favicon,
        removeFavicon: params.removeFavicon ? 'true' : undefined,
        primaryColor: params.primaryColor,
        resetPrimaryColor: params.resetPrimaryColor ? 'true' : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getBrandingControllerGetQueryKey(),
      });
      showSuccess(t('organization.saved'));
      onSuccess?.();
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'BRANDING_INVALID_FILE':
            showError(t('organization.invalidFile'));
            break;
          case 'BRANDING_INVALID_COLOR':
            showError(t('organization.errorInvalidColor'));
            break;
          case 'BRANDING_INSUFFICIENT_CONTRAST':
            showError(t('organization.errorInsufficientContrast'));
            break;
          default:
            showError(t('organization.error'));
        }
      } catch {
        // Non-AxiosError (network failure, request cancellation, etc.)
        showError(t('organization.error'));
      }
    },
  });

  return {
    updateBranding: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
