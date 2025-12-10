import {
  getUserControllerGetUsersInOrganizationQueryKey,
  useUserControllerDeleteUser,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

interface UseUserDeleteOptions {
  onSuccessCallback?: () => void;
}

export function useUserDelete(options?: UseUserDeleteOptions) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-users');
  const deleteUserMutation = useUserControllerDeleteUser({
    mutation: {
      onSuccess: () => {
        console.log('Delete user succeeded, invalidating queries');
        showSuccess(t('userDelete.success'));
        void queryClient.invalidateQueries({
          queryKey: [...getUserControllerGetUsersInOrganizationQueryKey()],
        });

        // Call the success callback
        if (options?.onSuccessCallback) {
          options.onSuccessCallback();
        }
      },
      onError: (err) => {
        console.error('Error deleting user', err);
        try {
          const { code } = extractErrorData(err);
          switch (code) {
            case 'USER_NOT_FOUND':
              showError(t('userDelete.notFound'));
              break;
            default:
              showError(t('userDelete.error'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('userDelete.error'));
        }
      },
    },
  });

  function deleteUser(userId: string) {
    deleteUserMutation.mutate({ id: userId });
  }

  return {
    deleteUser,
    isLoading: deleteUserMutation.isPending,
    isError: deleteUserMutation.isError,
    error: deleteUserMutation.error,
  };
}
