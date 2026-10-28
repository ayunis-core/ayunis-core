import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ayunis/ui/components/alert-dialog';
import { useDeleteWorkspace, type Workspace } from '@/features/workspaces';

export function WorkspaceDeleteDialog({
  workspace,
  open,
  onOpenChange,
  onDeleted,
}: Readonly<{
  workspace: Workspace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}>) {
  const { t } = useTranslation('workspaces');
  const [confirmationName, setConfirmationName] = useState('');
  const { mutate: deleteWorkspace, isPending } = useDeleteWorkspace(() => {
    setConfirmationName('');
    onOpenChange(false);
    onDeleted?.();
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setConfirmationName('');
    onOpenChange(nextOpen);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid="workspace-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteDialog.description', { name: workspace.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="workspace-delete-confirmation">
            {t('deleteDialog.confirmNameLabel', { name: workspace.name })}
          </Label>
          <Input
            id="workspace-delete-confirmation"
            value={confirmationName}
            onChange={(event) => setConfirmationName(event.target.value)}
            autoComplete="off"
            disabled={isPending}
            data-testid="workspace-delete-confirmation"
          />
        </div>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {t('deleteDialog.cancelText')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteWorkspace(workspace.id)}
            disabled={confirmationName !== workspace.name || isPending}
            data-testid="workspace-delete-confirm"
          >
            {t('deleteDialog.confirmText')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
