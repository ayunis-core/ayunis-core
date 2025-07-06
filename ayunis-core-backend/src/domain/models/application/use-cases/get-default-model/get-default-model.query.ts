import { UUID } from 'crypto';

export class GetDefaultModelQuery {
  public readonly orgId: UUID;
  public readonly userId?: UUID;
  public readonly blacklistedModelIds?: UUID[];

  constructor(params: {
    orgId: UUID;
    userId?: UUID;
    blacklistedModelIds?: UUID[];
  }) {
    this.orgId = params.orgId;
    this.userId = params.userId;
    this.blacklistedModelIds = params.blacklistedModelIds;
  }
}
