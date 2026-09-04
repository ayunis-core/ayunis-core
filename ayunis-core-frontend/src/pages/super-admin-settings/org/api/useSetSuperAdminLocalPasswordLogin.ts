import { getSsoErrorKey } from '@/pages/super-admin-settings/org/api/ssoMutationError';
import {
  getSuperAdminSsoConnectionsControllerGetQueryKey,
  useSuperAdminSsoConnectionsControllerSetLocalPasswordLoginEnabled,
} from '@/shared/api';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export function useSetSuperAdminLocalPasswordLogin(orgId: string) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();

  return useSuperAdminSsoConnectionsControllerSetLocalPasswordLoginEnabled({
    mutation: {
      onSuccess: (_data, variables) => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminSsoConnectionsControllerGetQueryKey(orgId),
        });
        showSuccess(
          t(
            variables.data.enabled
              ? 'sso.passwordLogin.restoreSuccess'
              : 'sso.passwordLogin.requireSsoSuccess',
          ),
        );
      },
      onError: (error) => showError(t(getSsoErrorKey(error))),
    },
  });
}
