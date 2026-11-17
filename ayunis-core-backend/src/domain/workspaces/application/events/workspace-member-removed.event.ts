import type { UUID } from 'crypto';

/**
 * Emitted after a member was removed from a workspace or left it, once the
 * removal is committed. Their chats in the workspace stay; access to them
 * ends with the membership.
 */
export class WorkspaceMemberRemovedEvent {
  static readonly EVENT_NAME = 'workspace.member-removed';

  constructor(
    public readonly workspaceId: UUID,
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {}
}
