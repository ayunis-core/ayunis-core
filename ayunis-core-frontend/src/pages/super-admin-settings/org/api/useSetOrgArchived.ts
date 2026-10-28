import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getSuperAdminOrgsControllerGetAllOrgsQueryKey,
  getSuperAdminOrgsControllerGetOrgByIdQueryKey,
  useSuperAdminOrgLifecycleControllerSetOrgArchived,
} from '@/shared/api';
import { showError, showSuccess } from '@/shared/lib/toast';
import { orgLifecycleErrorKey } from './orgLifecycleError';
export function useSetOrgArchived() {
  const client = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('super-admin-settings-org');
  return useSuperAdminOrgLifecycleControllerSetOrgArchived({
    mutation: {
      onSuccess: (org) => {
        void client.invalidateQueries({
          queryKey: getSuperAdminOrgsControllerGetAllOrgsQueryKey(),
        });
        void client.invalidateQueries({
          queryKey: getSuperAdminOrgsControllerGetOrgByIdQueryKey(org.id),
        });
        void router.invalidate();
        showSuccess(
          t(
            org.archived
              ? 'lifecycle.archivedSuccess'
              : 'lifecycle.restoredSuccess',
          ),
        );
      },
      onError: (error) => showError(t(orgLifecycleErrorKey(error))),
    },
  });
}
