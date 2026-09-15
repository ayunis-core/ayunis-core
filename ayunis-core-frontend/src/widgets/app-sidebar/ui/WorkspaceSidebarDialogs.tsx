import { useNavigate, useParams } from '@tanstack/react-router';
import {
  WorkspaceDeleteDialog,
  WorkspaceSettingsDialog,
} from '@/widgets/workspace-settings-dialog';
import type { Workspace } from '@/features/workspaces';

interface WorkspaceSidebarDialogsProps {
  settingsWorkspace: Workspace | null;
  workspaceToDelete: Workspace | null;
  onCloseSettings: () => void;
  onCloseDelete: () => void;
}

export function WorkspaceSidebarDialogs({
  settingsWorkspace,
  workspaceToDelete,
  onCloseSettings,
  onCloseDelete,
}: Readonly<WorkspaceSidebarDialogsProps>) {
  const navigate = useNavigate();
  const params = useParams({ strict: false });

  return (
    <>
      {settingsWorkspace && (
        <WorkspaceSettingsDialog
          key={settingsWorkspace.id}
          workspace={settingsWorkspace}
          open
          onOpenChange={(open) => {
            if (!open) onCloseSettings();
          }}
        />
      )}
      {workspaceToDelete && (
        <WorkspaceDeleteDialog
          workspace={workspaceToDelete}
          open
          onOpenChange={(open) => {
            if (!open) onCloseDelete();
          }}
          onDeleted={() => {
            if (params.workspaceId === workspaceToDelete.id)
              void navigate({ to: '/chat' });
          }}
        />
      )}
    </>
  );
}
