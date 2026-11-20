import type { UUID } from 'crypto';
import {
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/common/context/testing/context.fixtures';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { NotificationsRepository } from 'src/domain/notifications/application/ports/notifications.repository';
import { Notification } from 'src/domain/notifications/domain/notification.entity';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';

export { TEST_ORG_ID, TEST_USER_ID };
export const TEST_NOTIFICATION_ID =
  '66666666-6666-4666-8666-666666666666' as UUID;
export const TEST_ROUTINE_ID = '44444444-4444-4444-8444-444444444444' as UUID;
export const TEST_ROUTINE_THREAD_ID =
  '77777777-7777-4777-8777-777777777777' as UUID;

export function aNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return new Notification({
    id: TEST_NOTIFICATION_ID,
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
    type: NotificationType.ROUTINE,
    headline: 'Neue Verordnung zur Grundsteuer',
    subheadline: 'GVBl. NRW vom 07.11.2026',
    body: 'Die [Verordnung](https://recht.nrw.de/gvbl/2026-11-07) ändert die Hebesätze ab 2027.',
    routineId: TEST_ROUTINE_ID,
    routineThreadId: TEST_ROUTINE_THREAD_ID,
    createdAt: new Date('2026-11-07T06:35:00.000Z'),
    ...overrides,
  });
}

export function createMockNotificationsRepository(): jest.Mocked<NotificationsRepository> {
  return {
    create: jest
      .fn()
      .mockImplementation((notification: Notification) =>
        Promise.resolve(notification),
      ),
    createWithinRoutineThreadLimit: jest
      .fn()
      .mockImplementation((notification: Notification) =>
        Promise.resolve(notification),
      ),
    findById: jest.fn().mockResolvedValue(null),
    findPageByUserId: jest.fn().mockResolvedValue(
      new Paginated<Notification>({
        data: [],
        limit: 20,
        offset: 0,
        total: 0,
      }),
    ),
    countUnreadByType: jest.fn().mockResolvedValue([]),
    markRead: jest.fn().mockResolvedValue(null),
    markAllRead: jest.fn().mockResolvedValue(0),
    countByOrgCreatedBefore: jest.fn().mockResolvedValue(0),
    deleteByOrgCreatedBefore: jest.fn().mockResolvedValue(0),
  };
}
