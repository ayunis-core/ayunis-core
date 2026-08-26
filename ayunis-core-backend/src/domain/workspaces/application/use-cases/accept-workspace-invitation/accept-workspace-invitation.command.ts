import type { UUID } from 'crypto';

export class AcceptWorkspaceInvitationCommand {
  constructor(public readonly workspaceId: UUID) {}
}
