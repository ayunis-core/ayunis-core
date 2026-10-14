import { useTranslation } from 'react-i18next';
import type { InviteResponseDto } from '@/shared/api';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useDeleteSuperAdminInvite } from '@/pages/super-admin-settings/org/api/useDeleteSuperAdminInvite';
import { useDeleteAllSuperAdminInvites } from '@/pages/super-admin-settings/org/api/useDeleteAllSuperAdminInvites';

export function useSuperAdminInviteActions(orgId: string) {
  const { t } = useTranslation('admin-settings-users');
  const { confirm } = useConfirmation();
  const deleteInvite = useDeleteSuperAdminInvite();
  const deleteAll = useDeleteAllSuperAdminInvites();
  return {
    isDeleting: deleteInvite.isPending || deleteAll.isPending,
    deleteInvite: (invite: InviteResponseDto) =>
      confirm({
        title: t('confirmations.deleteInviteTitle'),
        description: t('confirmations.deleteInviteDescription', {
          email: invite.email,
        }),
        confirmText: t('confirmations.deleteText'),
        cancelText: t('confirmations.cancelText'),
        variant: 'destructive',
        onConfirm: () => deleteInvite.mutate({ orgId, inviteId: invite.id }),
      }),
    deleteAll: () =>
      confirm({
        title: t('confirmations.deleteAllInvitesTitle'),
        description: t('confirmations.deleteAllOrgInvitesDescription'),
        confirmText: t('confirmations.deleteText'),
        cancelText: t('confirmations.cancelText'),
        variant: 'destructive',
        onConfirm: () => deleteAll.mutate({ orgId }),
      }),
  };
}
