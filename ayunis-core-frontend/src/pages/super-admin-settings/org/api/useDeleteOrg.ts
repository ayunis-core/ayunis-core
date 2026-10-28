import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getSuperAdminOrgsControllerGetAllOrgsQueryKey,
  getSuperAdminOrgsControllerGetOrgByIdQueryKey,
  useSuperAdminOrgLifecycleControllerDeleteOrg,
} from '@/shared/api';
import { showError, showSuccess } from '@/shared/lib/toast';
import { orgLifecycleErrorKey } from './orgLifecycleError';
export function useDeleteOrg() {
  const client = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('super-admin-settings-org');
  return useSuperAdminOrgLifecycleControllerDeleteOrg({
    mutation: {
      onSuccess: (_data, variables) => {
        client.removeQueries({
          queryKey: getSuperAdminOrgsControllerGetOrgByIdQueryKey(variables.id),
        });
        void client.invalidateQueries({
          queryKey: getSuperAdminOrgsControllerGetAllOrgsQueryKey(),
        });
        void router.navigate({ to: '/super-admin-settings/orgs' });
        showSuccess(t('lifecycle.deletedSuccess'));
      },
      onError: (error) => showError(t(orgLifecycleErrorKey(error))),
    },
  });
}
