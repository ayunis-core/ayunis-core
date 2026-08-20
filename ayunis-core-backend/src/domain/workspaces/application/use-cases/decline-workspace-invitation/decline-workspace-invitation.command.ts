import type { UUID } from 'crypto';

export class DeclineWorkspaceInvitationCommand {
  constructor(public readonly workspaceId: UUID) {}
}
