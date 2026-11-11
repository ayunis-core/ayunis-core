import type { UUID } from 'crypto';

export class SearchOrgUsersQuery {
  public readonly search?: string;
  public readonly excludeIds: UUID[];
  public readonly limit: number;

  constructor(params: { search?: string; excludeIds?: UUID[]; limit: number }) {
    this.search = params.search;
    this.excludeIds = params.excludeIds ?? [];
    this.limit = params.limit;
  }
}
