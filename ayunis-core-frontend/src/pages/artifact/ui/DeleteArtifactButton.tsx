import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { useConfirmation } from '@/widgets/confirmation-modal';

interface DeleteArtifactButtonProps {
  readonly title: string;
  readonly isDeleting: boolean;
  readonly onDelete: () => void;
}

export function DeleteArtifactButton({
  title,
  isDeleting,
  onDelete,
}: DeleteArtifactButtonProps) {
  const { t } = useTranslation('artifacts');
  const { confirm } = useConfirmation();
  return (
    <Button
      variant="destructive-ghost"
      size="sm"
      disabled={isDeleting}
      data-testid="artifact-delete"
      onClick={() =>
        confirm({
          title: t('delete.confirmTitle'),
          description: t('delete.confirmDescription', { title }),
          confirmText: t('delete.confirmText'),
          cancelText: t('delete.cancelText'),
          variant: 'destructive',
          onConfirm: onDelete,
        })
      }
    >
      <Trash2 />
      {t('delete.button')}
    </Button>
  );
}
