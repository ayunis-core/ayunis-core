import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import type { McpIntegration } from '../model/types';
import { useDeleteIntegration } from '../api/useDeleteIntegration';

interface DeleteConfirmationDialogProps {
  integration: McpIntegration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteConfirmationDialog({
  integration,
  open,
  onOpenChange,
}: DeleteConfirmationDialogProps) {
  const { t } = useTranslation('admin-settings-integrations');
  const { deleteIntegration, isDeleting } = useDeleteIntegration(() => {
    onOpenChange(false);
  });

  if (!integration) return null;

  const handleConfirm = () => {
    deleteIntegration(integration.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('integrations.deleteDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('integrations.deleteDialog.description', {
              name: integration.name,
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            {t('integrations.deleteDialog.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting
              ? t('integrations.deleteDialog.deleting')
              : t('integrations.deleteDialog.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
