import type { Favorite } from '@/features/favorites';
import type { Workspace } from '@/features/workspaces';

export interface WorkspaceGroups {
  favorites: Workspace[];
  others: Workspace[];
}

export function groupFavoriteWorkspaces(
  workspaces: Workspace[],
  favorites: Favorite[],
): WorkspaceGroups {
  const favoriteIds = favorites
    .filter((favorite) => favorite.referenceType === 'workspace')
    .sort((a, b) => a.position - b.position)
    .map((favorite) => favorite.referenceId);
  const byId = new Map(
    workspaces.map((workspace) => [workspace.id, workspace]),
  );

  return {
    favorites: favoriteIds.flatMap((id) => byId.get(id) ?? []),
    others: workspaces.filter(
      (workspace) => !favoriteIds.includes(workspace.id),
    ),
  };
}
