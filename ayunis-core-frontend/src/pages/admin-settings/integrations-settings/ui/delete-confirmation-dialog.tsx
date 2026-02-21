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
}: Readonly<DeleteConfirmationDialogProps>) {
  const { t } = useTranslation('admin-settings-integrations');
  const { deleteIntegration, isDeleting } = useDeleteIntegration(() => {
    onOpenChange(false);
  });

  const handleConfirm = () => {
    if (integration) {
      deleteIntegration(integration.id);
    }
  };

  // Important: Dialog must always be rendered (not conditionally returned) so it receives
  // the open={false} transition. Without this, Radix UI won't clean up its Portal and
  // overlay, leaving an invisible layer that blocks all pointer events.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {integration && (
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
      )}
    </Dialog>
  );
}
