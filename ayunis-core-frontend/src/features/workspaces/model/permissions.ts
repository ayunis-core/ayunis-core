import type { WorkspaceResponseDtoRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function canEditWorkspace(role?: WorkspaceResponseDtoRole): boolean {
  return role === 'edit' || role === 'full';
}

export function canShareWorkspace(role?: WorkspaceResponseDtoRole): boolean {
  return role === 'full';
}
