import type { ArtifactResponseDto } from '@/shared/api';
import { getWorkspaceAccess, type Workspace } from '@/features/workspaces';

/**
 * Mirrors the API's delete rule: a personal artifact can only be opened by its
 * owner, who may delete it; a workspace artifact may be deleted by its creator
 * and by members who may manage the workspace.
 */
export function canDeleteArtifact(
  artifact: Pick<ArtifactResponseDto, 'ownerType' | 'creatorId'>,
  userId: string | undefined,
  workspace?: Pick<Workspace, 'role' | 'permissions'>,
): boolean {
  if (artifact.ownerType === 'personal') return true;
  if (userId !== undefined && artifact.creatorId === userId) return true;
  return workspace ? getWorkspaceAccess(workspace).canManage : false;
}
