import {
  useSuperAdminAddonsControllerActivate,
  getSuperAdminAddonsControllerListQueryKey,
} from '@ayunis/api-client';
import type { AddonType } from '@ayunis/api-client';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export function useSuperAdminActivateAddon(orgId: string) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();

  const mutation = useSuperAdminAddonsControllerActivate({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminAddonsControllerListQueryKey(orgId),
        });
        showSuccess(t('addons.activate.success'));
      },
      onError: (error) => {
        try {
          extractErrorData(error);
          showError(t('addons.activate.error'));
        } catch {
          showError(t('addons.activate.error'));
        }
      },
    },
  });

  function activateAddon(type: AddonType) {
    mutation.mutate({ orgId, type });
  }

  return {
    activateAddon,
    isLoading: mutation.isPending,
  };
}
