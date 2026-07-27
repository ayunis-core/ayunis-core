import {
  useUserControllerUpdateUserRole,
  getUserControllerGetUsersInOrganizationQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { UserRole } from '../model/openapi';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

interface UserRoleUpdateData {
  id: string;
  role: UserRole;
}

interface UseUserRoleUpdateOptions {
  onSuccessCallback?: () => void;
}

export function useUserRoleUpdate(options?: UseUserRoleUpdateOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-users');
  const updateUserRoleMutation = useUserControllerUpdateUserRole({
    mutation: {
      onSuccess: async () => {
        showSuccess(t('userRoleUpdate.success'));
        // The users list is loaded via the route loader's fetchQuery, and the
        // global staleTime (5m) means router.invalidate() alone re-runs the
        // loader but gets the cached (stale) list. Invalidate the query first so
        // the loader refetches and the Role column updates without a refresh.
        await queryClient.invalidateQueries({
          queryKey: getUserControllerGetUsersInOrganizationQueryKey(),
        });
        await router.invalidate();

        // Call the success callback
        if (options?.onSuccessCallback) {
          options.onSuccessCallback();
        }
      },
      onError: (err) => {
        console.error('Error updating user role', err);
        try {
          const { code } = extractErrorData(err);
          if (code === 'USER_NOT_FOUND') {
            showError(t('userRoleUpdate.notFound'));
          } else {
            showError(t('userRoleUpdate.error'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('userRoleUpdate.error'));
        }
      },
    },
  });

  function updateUserRole(data: UserRoleUpdateData) {
    const roleData = {
      role: data.role,
    };

    updateUserRoleMutation.mutate({
      id: data.id,
      data: roleData,
    });
  }

  return {
    updateUserRole,
    isLoading: updateUserRoleMutation.isPending,
    isError: updateUserRoleMutation.isError,
    error: updateUserRoleMutation.error,
  };
}
