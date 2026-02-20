import {
  getUserControllerGetUsersInOrganizationQueryKey,
  getSubscriptionsControllerGetSubscriptionQueryKey,
  useUserControllerDeleteUser,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

interface UseUserDeleteOptions {
  onSuccessCallback?: () => void;
}

export function useUserDelete(options?: UseUserDeleteOptions) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');
  const deleteUserMutation = useUserControllerDeleteUser({
    mutation: {
      onSuccess: () => {
        showSuccess(t('userDelete.success'));

        // Call the success callback
        if (options?.onSuccessCallback) {
          options.onSuccessCallback();
        }
      },
      onError: (err) => {
        console.error('Error deleting user', err);
        try {
          const { code } = extractErrorData(err);
          if (code === 'USER_NOT_FOUND') {
            showError(t('userDelete.notFound'));
          } else {
            showError(t('userDelete.error'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('userDelete.error'));
        }
      },
      onSettled: () => {
        // Invalidate users list query to refresh the data
        void queryClient.invalidateQueries({
          queryKey: getUserControllerGetUsersInOrganizationQueryKey(),
        });
        // Invalidate subscription query as deleting a user frees up a seat
        void queryClient.invalidateQueries({
          queryKey: getSubscriptionsControllerGetSubscriptionQueryKey(),
        });
        // Invalidate router to refresh route data
        void router.invalidate();
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
