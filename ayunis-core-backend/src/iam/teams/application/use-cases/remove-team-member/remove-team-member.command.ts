import type { UUID } from 'crypto';

export class RemoveTeamMemberCommand {
  public readonly teamId: UUID;
  public readonly orgId?: UUID;
  public readonly userId: UUID;

  constructor(params: { orgId?: UUID; teamId: UUID; userId: UUID }) {
    this.teamId = params.teamId;
    this.orgId = params.orgId;
    this.userId = params.userId;
  }
}
