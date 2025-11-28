import {
  getSuperAdminUsersControllerGetUsersByOrgIdQueryKey,
  useSuperAdminUsersControllerCreateUser,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateUserDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import { useRouter } from '@tanstack/react-router';

interface UseSuperAdminCreateUserOptions {
  orgId: string;
  onSuccessCallback?: () => void;
}

export function useSuperAdminCreateUser(
  options: UseSuperAdminCreateUserOptions,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('super-admin-settings-org');
  const createUserMutation = useSuperAdminUsersControllerCreateUser({
    mutation: {
      onSuccess: () => {
        showSuccess(t('createUser.success'));
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminUsersControllerGetUsersByOrgIdQueryKey(
            options.orgId,
          ),
        });
        void router.invalidate({
          filter: (route) =>
            route.id === '/_authenticated/super-admin-settings/orgs/$id',
        });

        if (options.onSuccessCallback) {
          options.onSuccessCallback();
        }
      },
      onError: (err) => {
        const { code } = extractErrorData(err);
        switch (code) {
          case 'USER_EMAIL_PROVIDER_BLACKLISTED':
            showError(t('createUser.emailProviderBlacklisted'));
            break;
          case 'USER_ALREADY_EXISTS':
            showError(t('createUser.userAlreadyExists'));
            break;
          default:
            showError(t('createUser.error'));
        }
      },
    },
  });

  function createUser(data: CreateUserDto) {
    createUserMutation.mutate({ orgId: options.orgId, data });
  }

  return {
    createUser,
    isLoading: createUserMutation.isPending,
    isError: createUserMutation.isError,
    error: createUserMutation.error,
  };
}
