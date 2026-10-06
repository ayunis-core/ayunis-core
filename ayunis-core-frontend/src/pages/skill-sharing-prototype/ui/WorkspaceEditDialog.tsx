import { useForm } from 'react-hook-form';
import { showSuccess } from '@/shared/lib/toast';
import { useResetFormOnOpen } from '@/shared/lib/use-reset-form-on-open';
import {
  WorkspaceFormDialog,
  type WorkspaceFormData,
} from '@/widgets/workspace-form-dialog';
import { setWorkspaceDetails } from '@/widgets/sharing-prototype/model/prototype-store';
import type { PrototypeWorkspace } from '@/widgets/sharing-prototype/model/types';

function toFormValues(workspace: PrototypeWorkspace): WorkspaceFormData {
  return {
    name: workspace.name,
    description: workspace.description,
    icon: workspace.icon,
    color: workspace.color,
  };
}

export function WorkspaceEditDialog({
  workspace,
  open,
  onOpenChange,
}: Readonly<{
  workspace: PrototypeWorkspace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const form = useForm<WorkspaceFormData>({
    defaultValues: toFormValues(workspace),
  });

  useResetFormOnOpen({
    form,
    open,
    key: workspace.id,
    values: () => toFormValues(workspace),
  });

  return (
    <WorkspaceFormDialog
      title="Arbeitsbereichseinstellungen"
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={(data) => {
        setWorkspaceDetails(workspace.id, data);
        showSuccess('Änderungen gespeichert.');
        onOpenChange(false);
      }}
      isSubmitting={false}
      submitLabel="Speichern"
      submittingLabel="Wird gespeichert …"
    />
  );
}
