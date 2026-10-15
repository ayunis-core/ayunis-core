import { useTranslation } from 'react-i18next';
import type { SharingTeamDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useEndTeamSharing } from '@/widgets/workspace-members-dialog/api/useSharingActions';

export function useTeamSharingConfirm(workspace: { id: string; name: string }) {
  const { t } = useTranslation('workspace-sharing');
  const { confirm } = useConfirmation();
  const endTeamSharing = useEndTeamSharing(workspace);

  return {
    end: (team: SharingTeamDto) =>
      confirm({
        title: t('confirmEndTeam.title', { team: team.name }),
        description: t('confirmEndTeam.description', {
          workspace: workspace.name,
        }),
        confirmText: t('confirmEndTeam.confirm'),
        cancelText: t('confirmEndTeam.cancel'),
        onConfirm: () => endTeamSharing.mutate(team.teamId),
      }),
  };
}
