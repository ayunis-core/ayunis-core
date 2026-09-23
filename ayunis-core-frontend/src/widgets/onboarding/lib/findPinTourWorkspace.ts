import { isFavorite, type Favorite } from '@/features/favorites';
import type { Workspace } from '@/features/workspaces';

/** The workspace the "pin a workspace" tour step points at, if any. */
export function findPinTourWorkspace(
  workspaces: Workspace[],
  favorites: Favorite[] | undefined,
): Workspace | undefined {
  return workspaces.find(
    (workspace) => !isFavorite(favorites, workspace.id, 'workspace'),
  );
}
