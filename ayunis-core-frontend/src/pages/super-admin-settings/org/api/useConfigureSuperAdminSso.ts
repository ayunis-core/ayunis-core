import { getSsoErrorKey } from '@/pages/super-admin-settings/org/api/ssoMutationError';
import type { SsoConnectionFormFields } from '@/pages/super-admin-settings/org/model/types';
import {
  getSuperAdminSsoConnectionsControllerGetQueryKey,
  superAdminSsoConnectionsControllerConfigure,
  superAdminSsoConnectionsControllerSetIdp,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

type SaveSsoConnectionInput = SsoConnectionFormFields & {
  updateMapping: boolean;
};

export function useConfigureSuperAdminSso(
  orgId: string,
  form: UseFormReturn<SsoConnectionFormFields>,
) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (values: SaveSsoConnectionInput) => {
      if (values.updateMapping) {
        return superAdminSsoConnectionsControllerConfigure(orgId, {
          emailDomain: values.emailDomain,
          zitadelOrgId: values.zitadelOrgId,
          zitadelIdpId: values.zitadelIdpId,
          domainVerified: values.domainVerified,
        });
      }
      return superAdminSsoConnectionsControllerSetIdp(orgId, {
        zitadelIdpId: values.zitadelIdpId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getSuperAdminSsoConnectionsControllerGetQueryKey(orgId),
      });
      showSuccess(t('sso.configure.success'));
    },
    onError: (error) => {
      try {
        const { code, errors } = extractErrorData(error);
        if (code === 'VALIDATION_ERROR' && errors) {
          setValidationErrors(form, errors, t, 'sso.validation');
          return;
        }
      } catch {
        showError(t('sso.errors.unexpected'));
        return;
      }
      showError(t(getSsoErrorKey(error)));
    },
  });

  return { configure: mutation.mutate, isPending: mutation.isPending };
}
