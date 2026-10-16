import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useSetOrganizationSharing } from '@/widgets/workspace-members-dialog/api/useSharingActions';

export function useOrganizationSharingConfirm(workspace: {
  id: string;
  name: string;
}) {
  const { t } = useTranslation('workspace-sharing');
  const { confirm } = useConfirmation();
  const setSharing = useSetOrganizationSharing(workspace);
  const values = { workspace: workspace.name };

  return {
    isPending: setSharing.isPending,
    share: (onShared?: () => void) =>
      confirm({
        title: t('confirmOrganization.title'),
        description: t('confirmOrganization.description', values),
        confirmText: t('confirmOrganization.confirm'),
        cancelText: t('confirmOrganization.cancel'),
        onConfirm: () => setSharing.mutate(true, { onSuccess: onShared }),
      }),
    end: () =>
      confirm({
        title: t('confirmEnd.title'),
        description: t('confirmEnd.description', values),
        confirmText: t('confirmEnd.confirm'),
        cancelText: t('confirmEnd.cancel'),
        onConfirm: () => setSharing.mutate(false),
      }),
  };
}
