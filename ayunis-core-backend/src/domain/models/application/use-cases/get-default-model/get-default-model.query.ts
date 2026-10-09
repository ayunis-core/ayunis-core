import type { UUID } from 'crypto';

export class GetDefaultModelQuery {
  public readonly orgId: UUID;
  public readonly preferOrganizationDefault: boolean;
  public readonly excludeAnonymousOnly: boolean;
  public readonly userId?: UUID;
  public readonly excludedPermittedModelIds?: UUID[];

  constructor(params: {
    orgId: UUID;
    userId?: UUID;
    excludedPermittedModelIds?: UUID[];
    preferOrganizationDefault?: boolean;
    excludeAnonymousOnly?: boolean;
  }) {
    this.orgId = params.orgId;
    this.preferOrganizationDefault = params.preferOrganizationDefault ?? false;
    this.excludeAnonymousOnly = params.excludeAnonymousOnly ?? false;
    this.userId = params.userId;
    this.excludedPermittedModelIds = params.excludedPermittedModelIds;
  }
}
