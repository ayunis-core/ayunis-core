import type { UUID } from 'crypto';

export class GetOrgMemberCertificateQuery {
  public readonly orgId: UUID;
  public readonly userId: UUID;

  constructor(params: { orgId: UUID; userId: UUID }) {
    this.orgId = params.orgId;
    this.userId = params.userId;
  }
}
