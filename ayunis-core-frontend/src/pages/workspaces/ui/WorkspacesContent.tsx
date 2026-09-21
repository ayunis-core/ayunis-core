import { useFavorites } from '@/features/favorites';
import {
  findUnfavoritedWorkspace,
  type Workspace,
} from '@/features/workspaces';
import { WorkspaceRow } from './WorkspaceRow';

interface WorkspacesContentProps {
  workspaces: Workspace[];
}

export function WorkspacesContent({
  workspaces,
}: Readonly<WorkspacesContentProps>) {
  const { favorites, isLoading: areFavoritesLoading } = useFavorites();
  const pinTourWorkspaceId = areFavoritesLoading
    ? undefined
    : findUnfavoritedWorkspace(workspaces, favorites)?.id;

  return (
    <div className="flex flex-col gap-2">
      {workspaces.map((workspace) => (
        <WorkspaceRow
          key={workspace.id}
          workspace={workspace}
          pinTourTarget={workspace.id === pinTourWorkspaceId}
        />
      ))}
    </div>
  );
}
