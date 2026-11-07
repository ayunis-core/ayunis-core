import type { UUID } from 'crypto';
import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';

export class FindMyNotificationsQuery extends PaginatedQuery {
  public readonly routineId?: UUID;

  constructor(params: PaginatedQueryParams & { routineId?: UUID }) {
    super(params);
    this.routineId = params.routineId;
  }
}
