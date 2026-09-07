import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { Workspace } from '@/features/workspaces';
import { useResetFormOnOpen } from '@/shared/lib/use-reset-form-on-open';
import {
  WorkspaceFormDialog,
  type WorkspaceFormData,
} from '@/widgets/workspace-form-dialog';
import { useUpdateWorkspace } from '@/widgets/workspace-settings-dialog/api/useUpdateWorkspace';

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
}

export function WorkspaceSettingsDialog({
  workspace,
  open,
  onOpenChange,
}: Readonly<WorkspaceSettingsDialogProps>) {
  const { t } = useTranslation('workspaces');
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
    />
  );
}
