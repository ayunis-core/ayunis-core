import { showSuccess } from '@/shared/lib/toast';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { deleteSkill } from '@/widgets/sharing-prototype/model/prototype-store';
import type { PrototypeSkill } from '@/widgets/sharing-prototype/model/types';
import { linkedWarning } from '@/pages/skill-sharing-prototype/lib/linked-warning';

export function useDeleteWithConfirmation(
  onDeleted?: () => void,
): (skill: PrototypeSkill) => void {
  const { confirm } = useConfirmation();
  return (skill) =>
    confirm({
      title: 'Fähigkeit löschen',
      description: `Sind Sie sicher, dass Sie „${skill.name}“ löschen möchten?${linkedWarning('skill', skill.id)} Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      variant: 'destructive',
      onConfirm: () => {
        deleteSkill(skill.id);
        showSuccess(`„${skill.name}“ wurde gelöscht.`);
        onDeleted?.();
      },
    });
}
