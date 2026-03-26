import type { UUID } from 'crypto';

export class UpdateStartDateCommand {
  public readonly orgId: UUID;
  public readonly requestingUserId: UUID;
  public readonly startsAt: Date;

  constructor(params: { orgId: UUID; requestingUserId: UUID; startsAt: Date }) {
    this.orgId = params.orgId;
    this.requestingUserId = params.requestingUserId;
    this.startsAt = params.startsAt;
  }
}
