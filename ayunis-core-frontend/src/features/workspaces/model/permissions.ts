import type { WorkspaceResponseDtoAccessLevel } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function canEditWorkspace(
  accessLevel?: WorkspaceResponseDtoAccessLevel,
): boolean {
  return accessLevel === 'edit' || accessLevel === 'full';
}

export function canShareWorkspace(
  accessLevel?: WorkspaceResponseDtoAccessLevel,
): boolean {
  return accessLevel === 'full';
}
