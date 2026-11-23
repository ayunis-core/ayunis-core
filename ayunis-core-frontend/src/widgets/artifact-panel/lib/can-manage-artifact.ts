import type { ArtifactResponseDto } from '@/shared/api';
import { getWorkspaceAccess, type Workspace } from '@/features/workspaces';

/**
 * Mirrors the API's rule for deleting an artifact and converting it to a
 * normal one: a personal artifact can only be opened by its owner, who may do
 * both; for a workspace artifact its creator and members who may manage the
 * workspace may.
 */
export function canManageArtifact(
  artifact: Pick<ArtifactResponseDto, 'ownerType' | 'creatorId'>,
  userId: string | undefined,
  workspace?: Pick<Workspace, 'role' | 'permissions'>,
): boolean {
  if (artifact.ownerType === 'personal') return true;
  if (userId !== undefined && artifact.creatorId === userId) return true;
  return workspace ? getWorkspaceAccess(workspace).canManage : false;
}
