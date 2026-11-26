import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import {
  createMockNotificationsRepository,
  TEST_NOTIFICATION_ID,
} from 'src/domain/notifications/application/testing/notification.fixtures';
import { NotificationNotFoundError } from 'src/domain/notifications/application/notifications.errors';
import { MarkNotificationUnreadCommand } from './mark-notification-unread.command';
import { MarkNotificationUnreadUseCase } from './mark-notification-unread.use-case';

describe('MarkNotificationUnreadUseCase', () => {
  it("answers another user's notification with not found", async () => {
    const useCase = new MarkNotificationUnreadUseCase(
      createMockNotificationsRepository(),
      createMockContextService(),
    );

    await expect(
      useCase.execute(new MarkNotificationUnreadCommand(TEST_NOTIFICATION_ID)),
    ).rejects.toThrow(NotificationNotFoundError);
  });
});
