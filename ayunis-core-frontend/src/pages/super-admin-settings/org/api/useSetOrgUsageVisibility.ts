import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getSuperAdminOrgsControllerGetAllOrgsQueryKey,
  getSuperAdminOrgsControllerGetOrgByIdQueryKey,
  getUsageControllerGetUsageConfigQueryKey,
  getUsageControllerGetUserUsageQueryKey,
  getCreditLimitsControllerGetUserLimitsQueryKey,
  getCreditLimitsControllerGetTeamLimitsQueryKey,
  useSuperAdminOrgUsageVisibilityControllerSetUsageVisibility,
} from '@/shared/api';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

export function useSetOrgUsageVisibility() {
  const client = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('super-admin-settings-org');
  return useSuperAdminOrgUsageVisibilityControllerSetUsageVisibility({
    mutation: {
      onSuccess: (org) => {
        client.removeQueries({
          queryKey: getUsageControllerGetUserUsageQueryKey(),
        });
        client.removeQueries({
          queryKey: getCreditLimitsControllerGetUserLimitsQueryKey(),
        });
        client.removeQueries({
          queryKey: getCreditLimitsControllerGetTeamLimitsQueryKey(),
        });
        void client.invalidateQueries({
          queryKey: getUsageControllerGetUsageConfigQueryKey(),
        });
        void client.invalidateQueries({
          queryKey: getSuperAdminOrgsControllerGetAllOrgsQueryKey(),
        });
        void client.invalidateQueries({
          queryKey: getSuperAdminOrgsControllerGetOrgByIdQueryKey(org.id),
        });
        void router.invalidate();
        showSuccess(t('usageVisibility.success'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          showError(
            t(
              code === 'ORG_NOT_FOUND'
                ? 'usageVisibility.notFound'
                : 'usageVisibility.error',
            ),
          );
        } catch {
          showError(t('usageVisibility.error'));
        }
      },
    },
  });
}
