import type { UUID } from 'crypto';
import type { ResourceOwner } from 'src/domain/ownership/application/models/resource-owner';

/**
 * An artifact created in a personal chat belongs to that chat's user, one
 * created in a workspace chat to the workspace. Artifacts never change owner.
 */
export type ArtifactOwner =
  | (Extract<ResourceOwner, { type: 'personal' }> & { userId: UUID })
  | Extract<ResourceOwner, { type: 'workspace' }>;

/** The owner of the artifacts that belong in the chat. */
export function artifactOwnerOfChat(chat: {
  userId: UUID;
  workspaceId: UUID | null;
}): ArtifactOwner {
  return chat.workspaceId
    ? { type: 'workspace', workspaceId: chat.workspaceId }
    : { type: 'personal', userId: chat.userId };
}
