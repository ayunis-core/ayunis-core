import {
  useSuperAdminAddonsControllerDeactivate,
  getSuperAdminAddonsControllerListQueryKey,
} from '@/shared/api';
import type { AddonType } from '@/shared/api';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export function useSuperAdminDeactivateAddon(orgId: string) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();

  const mutation = useSuperAdminAddonsControllerDeactivate({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminAddonsControllerListQueryKey(orgId),
        });
        showSuccess(t('addons.deactivate.success'));
      },
      onError: (error) => {
        try {
          extractErrorData(error);
          showError(t('addons.deactivate.error'));
        } catch {
          showError(t('addons.deactivate.error'));
        }
      },
    },
  });

  function deactivateAddon(type: AddonType) {
    mutation.mutate({ orgId, type });
  }

  return {
    deactivateAddon,
    isLoading: mutation.isPending,
  };
}
