import { UUID } from 'crypto';

export class FindUsersByOrgIdQuery {
  public readonly orgId: UUID;
  public readonly search?: string;
  public readonly limit: number;
  public readonly offset: number;

  constructor(params: {
    orgId: UUID;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    this.orgId = params.orgId;
    this.search = params.search;
    this.limit = params.limit ?? 25;
    this.offset = params.offset ?? 0;
  }
}
