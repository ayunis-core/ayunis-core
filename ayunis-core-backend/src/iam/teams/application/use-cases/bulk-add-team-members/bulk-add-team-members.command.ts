import type { UUID } from 'crypto';

export class BulkAddTeamMembersCommand {
  public readonly teamId: UUID;
  public readonly orgId?: UUID;
  public readonly userIds: UUID[];

  constructor(params: { orgId?: UUID; teamId: UUID; userIds: UUID[] }) {
    this.teamId = params.teamId;
    this.orgId = params.orgId;
    this.userIds = params.userIds;
  }
}
