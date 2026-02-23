import { getInvitesControllerGetInvitesQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import { customAxiosInstance } from '@/shared/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';
import { useTranslation } from 'react-i18next';

interface ResendInviteResponse {
  url: string | null;
}

function resendExpiredInvite(inviteId: string): Promise<ResendInviteResponse> {
  return customAxiosInstance<ResendInviteResponse>({
    url: `/invites/${inviteId}/resend`,
    method: 'POST',
  });
}

export function useInviteResend(
  onInviteResent?: (response: ResendInviteResponse) => void,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');

  const mutation = useMutation({
    mutationFn: (inviteId: string) => resendExpiredInvite(inviteId),
    onSuccess: (response: ResendInviteResponse) => {
      showSuccess(t('inviteResend.success'));
      onInviteResent?.(response);
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'INVITE_NOT_FOUND':
            showError(t('inviteResend.error.inviteNotFound'));
            break;
          case 'INVITE_NOT_EXPIRED':
            showError(t('inviteResend.error.inviteNotExpired'));
            break;
          default:
            showError(t('inviteResend.error.unexpectedError'));
        }
      } catch {
        showError(t('inviteResend.error.unexpectedError'));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getInvitesControllerGetInvitesQueryKey(),
      });
      void router.invalidate();
    },
  });

  return {
    resendInvite: mutation.mutate,
    isResending: mutation.isPending,
  };
}
