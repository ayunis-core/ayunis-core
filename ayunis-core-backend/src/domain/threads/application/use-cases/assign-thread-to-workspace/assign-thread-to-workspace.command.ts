import type { UUID } from 'crypto';

export class AssignThreadToWorkspaceCommand {
  readonly threadId: UUID;
  /** `null` removes the thread from its workspace. */
  readonly workspaceId: UUID | null;

  constructor(params: { threadId: UUID; workspaceId: UUID | null }) {
    this.threadId = params.threadId;
    this.workspaceId = params.workspaceId;
  }
}
