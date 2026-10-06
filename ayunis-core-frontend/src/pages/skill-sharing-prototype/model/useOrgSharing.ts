import { showSuccess } from '@/shared/lib/toast';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { setOrgVisible } from '@/widgets/sharing-prototype/model/prototype-workspace-shares';
import type { PrototypeWorkspace } from '@/widgets/sharing-prototype/model/types';
import { notifyUnlinked } from '@/pages/skill-sharing-prototype/lib/notify-unlinked';

export function useOrgSharing(workspace: PrototypeWorkspace) {
  const { confirm } = useConfirmation();
  return {
    share: () =>
      confirm({
        title: 'Für die gesamte Organisation freigeben?',
        description: `Alle in Ihrer Organisation können „${workspace.name}“ dann verwenden und alles nutzen, was dort verknüpft ist. Das gilt auch für alle, die später dazukommen. Einzelnen Personen können Sie danach mehr Rechte geben oder den Zugriff wieder entziehen.`,
        confirmText: 'Freigeben',
        cancelText: 'Abbrechen',
        onConfirm: () => {
          setOrgVisible(workspace.id, true);
          showSuccess(
            `„${workspace.name}“ ist jetzt für die gesamte Organisation freigegeben.`,
          );
        },
      }),
    end: () =>
      confirm({
        title: 'Freigabe für die Organisation beenden?',
        description: `Dann haben nur noch eingeladene Personen und Teams Zugriff auf „${workspace.name}“.`,
        confirmText: 'Freigabe beenden',
        cancelText: 'Abbrechen',
        onConfirm: () => {
          notifyUnlinked(setOrgVisible(workspace.id, false));
        },
      }),
  };
}
