import { isFavorite, type Favorite } from '@/features/favorites';
import type { Workspace } from '@/features/workspaces/model/types';

export const WORKSPACES_PER_PAGE = 20;

export function findUnfavoritedWorkspace(
  workspaces: Workspace[],
  favorites: Favorite[] | undefined,
): Workspace | undefined {
  return workspaces
    .slice(0, WORKSPACES_PER_PAGE)
    .find((workspace) => !isFavorite(favorites, workspace.id, 'workspace'));
}
