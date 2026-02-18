import { UUID } from 'crypto';
import { PaginatedQuery, PaginatedQueryParams } from 'src/common/pagination';

export class ListTeamMembersQuery extends PaginatedQuery {
  public readonly teamId: UUID;

  constructor(params: PaginatedQueryParams & { teamId: UUID }) {
    super(params);
    this.teamId = params.teamId;
  }
}
