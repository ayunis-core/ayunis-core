import { CreateWorkspaceDialog } from '@/widgets/create-workspace-dialog';
import { useAssignThreadToWorkspace } from '@/widgets/chat-workspace-menu/api/useAssignThreadToWorkspace';

interface CreateChatWorkspaceDialogProps {
  threadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Creates a workspace and moves the chat into it. */
export function CreateChatWorkspaceDialog({
  threadId,
  open,
  onOpenChange,
}: Readonly<CreateChatWorkspaceDialogProps>) {
  const { mutate: assignToWorkspace } = useAssignThreadToWorkspace();

  if (!open) return null;

  return (
    <CreateWorkspaceDialog
      open={open}
      onOpenChange={onOpenChange}
      onCreated={(workspace) =>
        assignToWorkspace({ threadId, workspaceId: workspace.id })
      }
    />
  );
}
