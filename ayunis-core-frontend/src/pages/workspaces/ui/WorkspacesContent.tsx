import type { Workspace } from '@/features/workspaces';
import { WorkspaceRow } from './WorkspaceRow';

interface WorkspacesContentProps {
  workspaces: Workspace[];
}

export function WorkspacesContent({
  workspaces,
}: Readonly<WorkspacesContentProps>) {
  return (
    <div className="flex flex-col gap-2">
      {workspaces.map((workspace) => (
        <WorkspaceRow key={workspace.id} workspace={workspace} />
      ))}
    </div>
  );
}
