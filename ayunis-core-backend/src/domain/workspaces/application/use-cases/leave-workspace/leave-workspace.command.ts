import type { UUID } from 'crypto';

export class LeaveWorkspaceCommand {
  constructor(public readonly workspaceId: UUID) {}
}
