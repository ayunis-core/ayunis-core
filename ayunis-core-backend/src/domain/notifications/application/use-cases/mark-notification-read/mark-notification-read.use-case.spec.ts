import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import {
  aNotification,
  createMockNotificationsRepository,
  TEST_NOTIFICATION_ID,
  TEST_USER_ID,
} from 'src/domain/notifications/application/testing/notification.fixtures';
import { NotificationNotFoundError } from 'src/domain/notifications/application/notifications.errors';
import { MarkNotificationReadCommand } from './mark-notification-read.command';
import { MarkNotificationReadUseCase } from './mark-notification-read.use-case';

describe('MarkNotificationReadUseCase', () => {
  it("marks the current user's notification as read", async () => {
    const repository = createMockNotificationsRepository();
    const read = aNotification({ readAt: new Date() });
    repository.markRead.mockResolvedValue(read);
    const useCase = new MarkNotificationReadUseCase(
      repository,
      createMockContextService(),
    );

    await expect(
      useCase.execute(new MarkNotificationReadCommand(TEST_NOTIFICATION_ID)),
    ).resolves.toBe(read);
    expect(repository.markRead).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_NOTIFICATION_ID,
      expect.any(Date),
    );
  });

  it("answers another user's notification with not found", async () => {
    const repository = createMockNotificationsRepository();
    const useCase = new MarkNotificationReadUseCase(
      repository,
      createMockContextService(),
    );

    await expect(
      useCase.execute(new MarkNotificationReadCommand(TEST_NOTIFICATION_ID)),
    ).rejects.toThrow(NotificationNotFoundError);
  });
});
