import {
  useSuperAdminManagementControllerDemoteFromSuperAdmin,
  getSuperAdminManagementControllerListSuperAdminsQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

const REMOVE_ERROR_MAP: Record<string, string> = {
  USER_SELF_DEMOTION_NOT_ALLOWED: 'removeSuperAdmin.errorSelfDemotion',
  USER_LAST_SUPER_ADMIN: 'removeSuperAdmin.errorLastAdmin',
  USER_NOT_SUPER_ADMIN: 'removeSuperAdmin.errorNotSuperAdmin',
  USER_NOT_FOUND: 'removeSuperAdmin.errorNotFound',
};

export function useRemoveSuperAdmin() {
  const { t } = useTranslation('super-admin-settings-super-admins');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useSuperAdminManagementControllerDemoteFromSuperAdmin({
    mutation: {
      onSuccess: () => {
        showSuccess(t('removeSuperAdmin.success'));
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          const mappedKey = REMOVE_ERROR_MAP[code];
          if (mappedKey) {
            showError(t(mappedKey));
          } else {
            showError(t('removeSuperAdmin.error'));
          }
        } catch {
          showError(t('removeSuperAdmin.error'));
        }
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminManagementControllerListSuperAdminsQueryKey(),
        });
        await router.invalidate();
      },
    },
  });

  function removeSuperAdmin(userId: string) {
    mutation.mutate({ userId });
  }

  return {
    removeSuperAdmin,
    isRemoving: mutation.isPending,
  };
}
