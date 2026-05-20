import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  brandingControllerUpdate,
  getBrandingControllerGetQueryKey,
  superAdminBrandingControllerUpdate,
  getSuperAdminBrandingControllerGetQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import type { BrandingFormSubmitParams } from '../ui/BrandingForm';

interface UseUpdateOrgBrandingOptions {
  // When set, updates run against the super-admin per-org endpoint
  // (which additionally accepts the canonical org name).
  orgId?: string;
  onSuccess?: () => void;
}

export function useUpdateOrgBranding({
  orgId,
  onSuccess,
}: UseUpdateOrgBrandingOptions = {}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-organization');

  const mutation = useMutation({
    mutationFn: (params: BrandingFormSubmitParams) => {
      const dto = {
        displayName: params.displayName,
        favicon: params.favicon,
        removeFavicon: params.removeFavicon ? 'true' : undefined,
        primaryColor: params.primaryColor,
        resetPrimaryColor: params.resetPrimaryColor ? 'true' : undefined,
      };
      if (orgId) {
        return superAdminBrandingControllerUpdate(orgId, {
          ...dto,
          name: params.name,
        });
      }
      return brandingControllerUpdate(dto);
    },
    onSuccess: () => {
      if (orgId) {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminBrandingControllerGetQueryKey(orgId),
        });
      }
      // The current org's branding (sidebar, theme) may be affected either
      // way — a super admin can edit their own org too.
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
