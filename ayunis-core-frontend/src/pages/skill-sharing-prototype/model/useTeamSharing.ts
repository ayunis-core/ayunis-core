import { useConfirmation } from '@/widgets/confirmation-modal';
import { findTeam } from '@/widgets/sharing-prototype/model/access';
import { endTeamGrant } from '@/widgets/sharing-prototype/model/prototype-workspace-shares';
import type { PrototypeWorkspace } from '@/widgets/sharing-prototype/model/types';
import { notifyUnlinked } from '@/pages/skill-sharing-prototype/lib/notify-unlinked';

export function useTeamSharing(workspace: PrototypeWorkspace) {
  const { confirm } = useConfirmation();
  return {
    end: (teamId: string) =>
      confirm({
        title: `Freigabe für Team ${findTeam(teamId).name} beenden?`,
        description: `Wer nur über dieses Team Zugriff auf „${workspace.name}“ hat, verliert ihn. Wer später ins Team kommt, erhält keinen Zugriff mehr.`,
        confirmText: 'Freigabe beenden',
        cancelText: 'Abbrechen',
        onConfirm: () => {
          notifyUnlinked(endTeamGrant(workspace.id, teamId));
        },
      }),
  };
}
