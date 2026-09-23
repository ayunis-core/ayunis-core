import { isFavorite, type Favorite } from '@/features/favorites';
import { WORKSPACES_PER_PAGE, type Workspace } from '@/features/workspaces';

/** The workspace the "pin a workspace" tour step points at, if any. */
export function findPinTourWorkspace(
  workspaces: Workspace[],
  favorites: Favorite[] | undefined,
): Workspace | undefined {
  // The step opens page one of the list and the spotlight cannot scroll, so
  // only that page's rows can carry the handle. The overview receives exactly
  // that page; the onboarding step sees the whole list and must cut it here.
  return workspaces
    .slice(0, WORKSPACES_PER_PAGE)
    .find((workspace) => !isFavorite(favorites, workspace.id, 'workspace'));
}
