import { showSuccess } from '@/shared/lib/toast';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { deleteWorkspace } from '@/widgets/sharing-prototype/model/prototype-store';
import type { PrototypeWorkspace } from '@/widgets/sharing-prototype/model/types';

export function useDeleteWorkspaceWithConfirmation(
  onDeleted?: () => void,
): (workspace: PrototypeWorkspace) => void {
  const { confirm } = useConfirmation();
  return (workspace) =>
    confirm({
      title: 'Arbeitsbereich löschen',
      description: `„${workspace.name}“ und alle darin enthaltenen Chats werden unwiderruflich gelöscht. Alle Mitglieder verlieren den Zugriff.`,
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      variant: 'destructive',
      onConfirm: () => {
        deleteWorkspace(workspace.id);
        showSuccess(`„${workspace.name}“ wurde gelöscht.`);
        onDeleted?.();
      },
    });
}
