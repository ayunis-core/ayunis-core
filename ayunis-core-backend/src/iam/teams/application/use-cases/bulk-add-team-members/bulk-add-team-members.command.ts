import type { UUID } from 'crypto';

export class BulkAddTeamMembersCommand {
  public readonly teamId: UUID;
  public readonly userIds: UUID[];

  constructor(params: { teamId: UUID; userIds: UUID[] }) {
    this.teamId = params.teamId;
    this.userIds = params.userIds;
  }
}
