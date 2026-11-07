import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { useConfirmation } from '@/widgets/confirmation-modal';
import type { Routine } from '@/features/routines';
import { useDeleteRoutine } from '@/pages/routine/api/useDeleteRoutine';

export function RoutineDeleteButton({
  routine,
}: Readonly<{ routine: Routine }>) {
  const { t } = useTranslation('routines');
  const { confirm } = useConfirmation();
  const deleteRoutine = useDeleteRoutine();

  const handleDelete = () =>
    confirm({
      title: t('delete.title'),
      description: t('delete.description', { name: routine.name }),
      confirmText: t('delete.confirm'),
      cancelText: t('delete.cancel'),
      variant: 'destructive',
      onConfirm: () => deleteRoutine.mutate(routine.id),
    });

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive hover:text-destructive"
      onClick={handleDelete}
      disabled={deleteRoutine.isPending}
      aria-label={t('card.delete')}
      data-testid="routine-detail-delete"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
