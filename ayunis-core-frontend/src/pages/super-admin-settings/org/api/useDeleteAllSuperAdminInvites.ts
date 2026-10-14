import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  superAdminInvitesControllerDeleteAllPending,
  getSuperAdminInvitesControllerGetInvitesQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useDeleteAllSuperAdminInvites() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');
  return useMutation({
    mutationFn: ({ orgId }: { orgId: string }) =>
      superAdminInvitesControllerDeleteAllPending(orgId),
    onSuccess: async (data, { orgId }) => {
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
      showSuccess(t('deleteAllInvites.success', { count: data.deletedCount }));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'INVITE_NOT_FOUND'
              ? 'inviteDelete.notFound'
              : 'deleteAllInvites.error',
          ),
        );
      } catch {
        showError(t('deleteAllInvites.error'));
      }
    },
  });
}
