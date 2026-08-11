import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { useConfirmation } from '@/widgets/confirmation-modal';
import {
  useDeleteWorkspace,
  useUpdateWorkspace,
  type Workspace,
  type WorkspaceFormData,
} from '@/features/workspaces';
import { useResetFormOnOpen } from '@/shared/lib/use-reset-form-on-open';
import { WorkspaceFormDialog } from '@/widgets/workspace-form-dialog';

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
  const { confirm } = useConfirmation();

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

  function handleDelete() {
    confirm({
      title: t('deleteDialog.title'),
      description: t('deleteDialog.description', { name: workspace.name }),
      confirmText: t('deleteDialog.confirmText'),
      cancelText: t('deleteDialog.cancelText'),
      variant: 'destructive',
      onConfirm: () => deleteWorkspace(workspace.id),
    });
  }

  return (
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
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="text-destructive" />
            </Button>
          </ItemActions>
        </Item>
      }
    />
  );
}
