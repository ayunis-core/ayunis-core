import type { WorkspaceResponseDtoAccessLevel } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type WorkspaceAccessLevel = WorkspaceResponseDtoAccessLevel;

export type WorkspaceGrantLevel = Exclude<WorkspaceAccessLevel, 'owner'>;

export const WORKSPACE_GRANT_LEVELS: readonly WorkspaceGrantLevel[] = [
  'use',
  'edit',
  'full',
];

export function canEditWorkspace(level: WorkspaceAccessLevel): boolean {
  return level !== 'use';
}

export function canManageWorkspace(level: WorkspaceAccessLevel): boolean {
  return level === 'owner' || level === 'full';
}

export function isWorkspaceOwner(level: WorkspaceAccessLevel): boolean {
  return level === 'owner';
}
