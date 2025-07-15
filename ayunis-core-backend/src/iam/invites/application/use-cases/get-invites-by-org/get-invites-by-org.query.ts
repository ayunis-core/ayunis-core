import { UUID } from 'crypto';

export class GetInvitesByOrgQuery {
  public readonly orgId: UUID;
  public readonly requestingUserId: UUID;
  public readonly onlyOpen: boolean;

  constructor(params: {
    orgId: UUID;
    requestingUserId: UUID;
    onlyOpen?: boolean;
  }) {
    this.orgId = params.orgId;
    this.requestingUserId = params.requestingUserId;
    this.onlyOpen = params.onlyOpen ?? false;
  }
}
