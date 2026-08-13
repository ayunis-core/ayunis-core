import { getSsoErrorKey } from '@/pages/super-admin-settings/org/api/ssoMutationError';
import {
  getSuperAdminSsoConnectionsControllerGetQueryKey,
  useSuperAdminSsoConnectionsControllerSetJitProvisioning,
} from '@/shared/api';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export function useSetSuperAdminSsoJit(orgId: string) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();

  return useSuperAdminSsoConnectionsControllerSetJitProvisioning({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminSsoConnectionsControllerGetQueryKey(orgId),
        });
        showSuccess(t('sso.jit.success'));
      },
      onError: (error) => showError(t(getSsoErrorKey(error))),
    },
  });
}
