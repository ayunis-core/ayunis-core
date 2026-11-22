import type { UUID } from 'crypto';

export class DeleteThreadLinksOutsideScopeCommand {
  readonly threadId: UUID;
  /** The chat's workspace after the move; `null` for a personal chat. */
  readonly workspaceId: UUID | null;

  constructor(params: { threadId: UUID; workspaceId: UUID | null }) {
    this.threadId = params.threadId;
    this.workspaceId = params.workspaceId;
  }
}
