export const WORKSPACE_GRANT_LEVELS = ['use', 'edit', 'full'] as const;

export type WorkspaceGrantLevel = (typeof WORKSPACE_GRANT_LEVELS)[number];

export type WorkspaceAccessLevel = WorkspaceGrantLevel | 'owner';

const RANK: Record<WorkspaceAccessLevel, number> = {
  use: 1,
  edit: 2,
  full: 3,
  owner: 4,
};

export function hasAtLeast(
  level: WorkspaceAccessLevel | null,
  minimum: WorkspaceAccessLevel,
): boolean {
  return level !== null && RANK[level] >= RANK[minimum];
}

export function highestGrant(
  levels: (WorkspaceGrantLevel | null | undefined)[],
): WorkspaceGrantLevel | null {
  return levels.reduce<WorkspaceGrantLevel | null>(
    (best, level) =>
      level && (best === null || RANK[level] > RANK[best]) ? level : best,
    null,
  );
}

export function compareAccessLevels(
  a: WorkspaceAccessLevel,
  b: WorkspaceAccessLevel,
): number {
  return RANK[b] - RANK[a];
}
