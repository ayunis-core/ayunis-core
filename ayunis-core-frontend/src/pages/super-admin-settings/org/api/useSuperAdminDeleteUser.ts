import {
  getSuperAdminUsersControllerGetUsersByOrgIdQueryKey,
  useSuperAdminUsersControllerDeleteUser,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';

interface UseSuperAdminDeleteUserOptions {
  orgId: string;
  onSuccessCallback?: () => void;
}

export function useSuperAdminDeleteUser(
  options: UseSuperAdminDeleteUserOptions,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('super-admin-settings-org');
  const deleteUserMutation = useSuperAdminUsersControllerDeleteUser({
    mutation: {
      onSuccess: () => {
        showSuccess(t('deleteUser.success'));
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminUsersControllerGetUsersByOrgIdQueryKey(
            options.orgId,
          ),
        });
        void router.invalidate({
          filter: (route) =>
            route.id === '/_authenticated/super-admin-settings/orgs/$id',
        });

        // Call the success callback
        if (options.onSuccessCallback) {
          options.onSuccessCallback();
        }
      },
      onError: (err) => {
        console.error('Error deleting user', err);
        showError(t('deleteUser.error'));
      },
    },
  });

  function deleteUser(userId: string) {
    deleteUserMutation.mutate({ userId });
  }

  return {
    deleteUser,
    isLoading: deleteUserMutation.isPending,
    isError: deleteUserMutation.isError,
    error: deleteUserMutation.error,
  };
}
