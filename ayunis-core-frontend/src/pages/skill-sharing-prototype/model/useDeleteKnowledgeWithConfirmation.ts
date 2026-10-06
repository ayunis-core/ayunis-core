import { showSuccess } from '@/shared/lib/toast';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { deleteKnowledgeItem } from '@/widgets/sharing-prototype/model/prototype-knowledge';
import type { PrototypeKnowledge } from '@/widgets/sharing-prototype/model/types';
import { linkedWarning } from '@/pages/skill-sharing-prototype/lib/linked-warning';

export function useDeleteKnowledgeWithConfirmation(
  onDeleted?: () => void,
): (item: PrototypeKnowledge) => void {
  const { confirm } = useConfirmation();
  return (item) =>
    confirm({
      title: 'Wissenssammlung löschen',
      description: `Sind Sie sicher, dass Sie „${item.name}“ löschen möchten? Alle Dokumente darin werden mitgelöscht.${linkedWarning('knowledge', item.id)} Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      variant: 'destructive',
      onConfirm: () => {
        deleteKnowledgeItem(item.id);
        showSuccess(`„${item.name}“ wurde gelöscht.`);
        onDeleted?.();
      },
    });
}
