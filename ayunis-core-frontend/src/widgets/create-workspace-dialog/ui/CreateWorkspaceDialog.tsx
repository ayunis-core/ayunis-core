import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { WorkspaceResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  useCreateWorkspace,
  type WorkspaceFormData,
} from '@/features/workspaces';
import {
  DEFAULT_WORKSPACE_ICON,
  defaultWorkspaceColor,
} from '@/shared/lib/workspace-appearance';
import { useResetFormOnOpen } from '@/shared/lib/use-reset-form-on-open';
import { WorkspaceFormDialog } from '@/widgets/workspace-form-dialog';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefills the name, e.g. when creating a workspace from a chat's context menu. */
  initialName?: string;
  onCreated?: (workspace: WorkspaceResponseDto) => void;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  initialName = '',
  onCreated,
}: Readonly<CreateWorkspaceDialogProps>) {
  const { t } = useTranslation('workspaces');

  // Empty `color` means "derive from the name" until the user picks one; the
  // form dialog previews it the same way.
  const emptyForm: WorkspaceFormData = {
    name: initialName,
    description: '',
    icon: DEFAULT_WORKSPACE_ICON,
    color: '',
  };

  const form = useForm<WorkspaceFormData>({ defaultValues: emptyForm });

  // Re-seed only on the open transition, so an `initialName` that changes
  // while the dialog is open cannot wipe an in-progress draft.
  useResetFormOnOpen({ form, open, values: () => emptyForm });

  const { createWorkspace, isCreating } = useCreateWorkspace(
    form,
    (workspace) => {
      onOpenChange(false);
      // Reset to the empty form, not to the mount-time prefill.
      form.reset({ ...emptyForm, name: '' });
      onCreated?.(workspace);
    },
  );

  return (
    <WorkspaceFormDialog
      title={t('createDialog.title')}
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={(data) =>
        createWorkspace({
          ...data,
          color: data.color || defaultWorkspaceColor(data.name),
        })
      }
      isSubmitting={isCreating}
      submitLabel={t('createDialog.submit')}
      submittingLabel={t('createDialog.submitting')}
    />
  );
}
