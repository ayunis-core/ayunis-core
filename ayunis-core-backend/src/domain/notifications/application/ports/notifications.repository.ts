import type { UUID } from 'crypto';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import type { Notification } from 'src/domain/notifications/domain/notification.entity';

export interface NotificationsFilter {
  routineId?: UUID;
}

export abstract class NotificationsRepository {
  abstract create(notification: Notification): Promise<Notification>;
  /**
   * Creates the notification unless its routine thread already has `limit`
   * notifications, in which case nothing is written and null is returned.
   * Concurrent calls for the same thread are serialized, so the limit holds.
   */
  abstract createWithinRoutineThreadLimit(
    notification: Notification & { routineThreadId: UUID },
    limit: number,
  ): Promise<Notification | null>;
  abstract findById(userId: UUID, id: UUID): Promise<Notification | null>;
  /** Newest first. */
  abstract findPageByUserId(
    userId: UUID,
    page: PaginatedQueryParams,
    filter?: NotificationsFilter,
  ): Promise<Paginated<Notification>>;
  abstract countUnread(userId: UUID): Promise<number>;
  /** Keeps the first read time of a notification read before. */
  abstract markRead(
    userId: UUID,
    id: UUID,
    readAt: Date,
  ): Promise<Notification | null>;
  /** Returns how many notifications were unread. */
  abstract markAllRead(userId: UUID, readAt: Date): Promise<number>;
  abstract countByOrgCreatedBefore(orgId: UUID, before: Date): Promise<number>;
  abstract deleteByOrgCreatedBefore(orgId: UUID, before: Date): Promise<number>;
}
