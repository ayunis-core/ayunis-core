import { UUID } from 'crypto';

export class GetInvitesByOrgQuery {
  public readonly orgId: UUID;
  public readonly requestingUserId: UUID;
  public readonly onlyOpen: boolean;
  public readonly search?: string;
  public readonly limit: number;
  public readonly offset: number;

  constructor(params: {
    orgId: UUID;
    requestingUserId: UUID;
    onlyOpen?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    this.orgId = params.orgId;
    this.requestingUserId = params.requestingUserId;
    this.onlyOpen = params.onlyOpen ?? false;
    this.search = params.search;
    this.limit = params.limit ?? 25;
    this.offset = params.offset ?? 0;
  }
}
