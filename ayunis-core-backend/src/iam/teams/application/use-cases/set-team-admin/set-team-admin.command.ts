import type { UUID } from 'crypto';

export class SetTeamAdminCommand {
  public readonly teamId: UUID;
  public readonly userId: UUID;
  public readonly isTeamAdmin: boolean;
  public readonly orgId?: UUID;

  constructor(params: {
    teamId: UUID;
    userId: UUID;
    isTeamAdmin: boolean;
    orgId?: UUID;
  }) {
    this.teamId = params.teamId;
    this.userId = params.userId;
    this.isTeamAdmin = params.isTeamAdmin;
    this.orgId = params.orgId;
  }
}
