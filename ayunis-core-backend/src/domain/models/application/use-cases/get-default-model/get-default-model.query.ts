import type { UUID } from 'crypto';

export class GetDefaultModelQuery {
  public readonly orgId: UUID;
  public readonly userId?: UUID;
  public readonly excludedPermittedModelIds?: UUID[];

  constructor(params: {
    orgId: UUID;
    userId?: UUID;
    excludedPermittedModelIds?: UUID[];
  }) {
    this.orgId = params.orgId;
    this.userId = params.userId;
    this.excludedPermittedModelIds = params.excludedPermittedModelIds;
  }
}
