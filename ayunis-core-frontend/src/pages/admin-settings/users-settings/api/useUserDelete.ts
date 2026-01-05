import { useUserControllerDeleteUser } from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

interface UseUserDeleteOptions {
  onSuccessCallback?: () => void;
}

export function useUserDelete(options?: UseUserDeleteOptions) {
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');
  const deleteUserMutation = useUserControllerDeleteUser({
    mutation: {
      onSuccess: () => {
        showSuccess(t('userDelete.success'));
        void router.invalidate();

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
