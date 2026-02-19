import type { UUID } from 'crypto';
import type { PaginatedQueryParams } from 'src/common/pagination';
import { PaginatedQuery } from 'src/common/pagination';

export class ListTeamMembersQuery extends PaginatedQuery {
  public readonly teamId: UUID;

  constructor(params: PaginatedQueryParams & { teamId: UUID }) {
    super(params);
    this.teamId = params.teamId;
  }
}
