import type { UUID } from 'crypto';
import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import type { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';

export class FindMyNotificationsQuery extends PaginatedQuery {
  public readonly routineId?: UUID;
  public readonly type?: NotificationType;

  constructor(
    params: PaginatedQueryParams & {
      routineId?: UUID;
      type?: NotificationType;
    },
  ) {
    super(params);
    this.routineId = params.routineId;
    this.type = params.type;
  }
}
