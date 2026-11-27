import { useWorkspaces } from '@/features/workspaces';
import { WorkspacePickerMenuWithCreate } from '@ayunis/chat/workspaces';
import { useAssignThreadToWorkspace } from '@/widgets/chat-workspace-menu/api/useAssignThreadToWorkspace';

export interface ChatWorkspacePickerProps {
  threadId: string;
  workspaceId?: string | null;
  onCreateNew: () => void;
}

export function ChatWorkspacePicker({
  threadId,
  workspaceId,
  onCreateNew,
}: Readonly<ChatWorkspacePickerProps>) {
  const { workspaces } = useWorkspaces();
  const { mutate: assignToWorkspace } = useAssignThreadToWorkspace();

  return (
    <WorkspacePickerMenuWithCreate
      workspaces={workspaces}
      selectedWorkspaceId={workspaceId}
      onClear={() => assignToWorkspace({ threadId, workspaceId: null })}
      onSelect={(workspace) =>
        assignToWorkspace({ threadId, workspaceId: workspace.id })
      }
      onCreateNew={onCreateNew}
    />
  );
}
