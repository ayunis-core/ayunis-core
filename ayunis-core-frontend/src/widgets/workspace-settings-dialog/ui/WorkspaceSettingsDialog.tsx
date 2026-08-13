import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ayunis/ui/components/alert-dialog';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { useDeleteWorkspace, type Workspace } from '@/features/workspaces';
import { useResetFormOnOpen } from '@/shared/lib/use-reset-form-on-open';
import {
  WorkspaceFormDialog,
  type WorkspaceFormData,
} from '@/widgets/workspace-form-dialog';
import { useUpdateWorkspace } from '../api/useUpdateWorkspace';

function toFormValues(workspace: Workspace): WorkspaceFormData {
  return {
    name: workspace.name,
    description: workspace.description ?? '',
    icon: workspace.icon,
    color: workspace.color,
  };
}

interface WorkspaceSettingsDialogProps {
  workspace: Workspace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function WorkspaceSettingsDialog({
  workspace,
  open,
  onOpenChange,
  onDeleted,
}: Readonly<WorkspaceSettingsDialogProps>) {
  const { t } = useTranslation('workspaces');
  // A nested AlertDialog rather than the root-level confirmation modal: the
  // settings dialog is already an open Radix Dialog, and two sibling modal
  // roots fight over the body's pointer-events and focus trap.
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const form = useForm<WorkspaceFormData>({
    defaultValues: toFormValues(workspace),
  });

  useResetFormOnOpen({
    form,
    open,
    key: workspace.id,
    values: () => toFormValues(workspace),
  });

  const { updateWorkspace, isUpdating } = useUpdateWorkspace(
    workspace.id,
    form,
    () => onOpenChange(false),
  );

  const { mutate: deleteWorkspace, isPending: isDeleting } = useDeleteWorkspace(
    () => {
      onOpenChange(false);
      onDeleted?.();
    },
  );

  return (
    <>
      <WorkspaceFormDialog
        title={t('settingsDialog.title')}
        open={open}
        onOpenChange={onOpenChange}
        form={form}
        onSubmit={updateWorkspace}
        isSubmitting={isUpdating}
        submitLabel={t('settingsDialog.submit')}
        submittingLabel={t('settingsDialog.submitting')}
        footerContent={
          <Item variant="outline">
            <ItemContent>
              <ItemTitle>{t('deleteDialog.rowTitle')}</ItemTitle>
              <ItemDescription>
                {t('deleteDialog.rowDescription')}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('deleteDialog.rowTitle')}
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={isDeleting}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </ItemActions>
          </Item>
        }
      />
      <AlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: workspace.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              {t('deleteDialog.cancelText')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                deleteWorkspace(workspace.id);
              }}
              disabled={isDeleting}
            >
              {t('deleteDialog.confirmText')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
