import {
  getInvitesControllerGetInvitesQueryKey,
  useInvitesControllerCreate,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateInviteResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { InviteCreateData } from '../model/openapi';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

export function useInviteCreate(
  onInviteCreated?: (response: CreateInviteResponseDto) => void,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');
  const createInviteMutation = useInvitesControllerCreate({
    mutation: {
      onSuccess: (response: CreateInviteResponseDto) => {
        showSuccess(t('inviteCreate.success'));
        onInviteCreated?.(response);
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'USER_ALREADY_EXISTS':
              showError(t('inviteCreate.userAlreadyExists'));
              break;
            case 'EMAIL_NOT_AVAILABLE':
              showError(t('inviteCreate.emailNotAvailable'));
              break;
            case 'USER_EMAIL_PROVIDER_BLACKLISTED':
              showError(t('inviteCreate.emailProviderBlacklisted'));
              break;
            default:
              showError(t('inviteCreate.error'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('inviteCreate.error'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getInvitesControllerGetInvitesQueryKey(),
        });
        void router.invalidate();
      },
    },
  });

  function createInvite(data: InviteCreateData) {
    const inviteData: InviteCreateData = {
      email: data.email,
      role: data.role,
    };

    createInviteMutation.mutate({ data: inviteData });
  }

  return {
    createInvite,
    isLoading: createInviteMutation.isPending,
    isError: createInviteMutation.isError,
    error: createInviteMutation.error,
  };
}
