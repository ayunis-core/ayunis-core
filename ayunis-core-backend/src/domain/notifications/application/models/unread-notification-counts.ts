import type { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';

export interface UnreadNotificationTypeCount {
  type: NotificationType;
  count: number;
}

export class UnreadNotificationCounts {
  /** Only the types with unread notifications. */
  readonly byType: UnreadNotificationTypeCount[];

  constructor(byType: UnreadNotificationTypeCount[]) {
    this.byType = byType;
  }

  get total(): number {
    return this.byType.reduce((total, { count }) => total + count, 0);
  }
}
