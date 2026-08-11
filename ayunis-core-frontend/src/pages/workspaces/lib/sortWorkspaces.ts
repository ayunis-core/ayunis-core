import type { Workspace } from '@/features/workspaces';

export type WorkspaceSortKey = 'updatedAt' | 'createdAt' | 'alpha';

export const WORKSPACE_SORT_KEYS: readonly WorkspaceSortKey[] = [
  'updatedAt',
  'createdAt',
  'alpha',
];

export function sortWorkspaces(
  workspaces: Workspace[],
  sortKey: WorkspaceSortKey,
  locale?: string,
): Workspace[] {
  const sorted = [...workspaces];
  if (sortKey === 'alpha') {
    return sorted.sort((left, right) =>
      left.name.localeCompare(right.name, locale),
    );
  }
  if (sortKey === 'createdAt') {
    // Newest first. ISO-8601 strings compare correctly as strings.
    return sorted.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }
  // "Last updated" means activity: the later of the workspace's own edit and
  // its most recent chat activity, so busy workspaces rise even when their
  // settings were never touched.
  return sorted.sort((left, right) =>
    effectiveActivity(right).localeCompare(effectiveActivity(left)),
  );
}

export function filterWorkspaces(
  workspaces: Workspace[],
  search: string,
): Workspace[] {
  const term = search.trim().toLowerCase();
  if (!term) return workspaces;
  return workspaces.filter((workspace) =>
    workspace.name.toLowerCase().includes(term),
  );
}

function effectiveActivity(workspace: Workspace): string {
  return workspace.lastActivityAt ?? workspace.updatedAt;
}
