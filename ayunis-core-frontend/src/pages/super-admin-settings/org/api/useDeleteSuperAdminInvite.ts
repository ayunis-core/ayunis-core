import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  superAdminInvitesControllerDeleteInvite,
  getSuperAdminInvitesControllerGetInvitesQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useDeleteSuperAdminInvite() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');
  return useMutation({
    mutationFn: ({ orgId, inviteId }: { orgId: string; inviteId: string }) =>
      superAdminInvitesControllerDeleteInvite(orgId, inviteId),
    onSuccess: async (_data, { orgId }) => {
      await queryClient.invalidateQueries({
        queryKey: getSuperAdminInvitesControllerGetInvitesQueryKey(orgId),
      });
      await router.navigate({
        from: '/super-admin-settings/orgs/$id',
        to: '/super-admin-settings/orgs/$id',
        params: { id: orgId },
        search: (previous) => ({
          ...previous,
          tab: 'users' as const,
          invitesPage: undefined,
        }),
      });
      await router.invalidate();
      showSuccess(t('inviteDelete.success'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'INVITE_NOT_FOUND'
              ? 'inviteDelete.notFound'
              : 'inviteDelete.error.unexpectedError',
          ),
        );
      } catch {
        showError(t('inviteDelete.error.unexpectedError'));
      }
    },
  });
}
