import {
  useSuperAdminManagementControllerPromoteToSuperAdmin,
  getSuperAdminManagementControllerListSuperAdminsQueryKey,
  type PromoteToSuperAdminDto,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

interface UseAddSuperAdminOptions {
  onSuccessCallback?: () => void;
}

const ADD_ERROR_MAP: Record<string, string> = {
  USER_NOT_FOUND: 'addSuperAdmin.errorNotFound',
};

export function useAddSuperAdmin(options?: UseAddSuperAdminOptions) {
  const { t } = useTranslation('super-admin-settings-super-admins');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useSuperAdminManagementControllerPromoteToSuperAdmin({
    mutation: {
      onSuccess: () => {
        showSuccess(t('addSuperAdmin.success'));
        options?.onSuccessCallback?.();
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          const mappedKey = ADD_ERROR_MAP[code];
          if (mappedKey) {
            showError(t(mappedKey));
          } else {
            showError(t('addSuperAdmin.error'));
          }
        } catch {
          showError(t('addSuperAdmin.error'));
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

  function addSuperAdmin(data: PromoteToSuperAdminDto) {
    mutation.mutate({ data });
  }

  return {
    addSuperAdmin,
    isAdding: mutation.isPending,
  };
}
