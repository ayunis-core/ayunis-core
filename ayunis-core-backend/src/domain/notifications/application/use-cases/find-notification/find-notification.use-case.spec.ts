import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  aNotification,
  createMockNotificationsRepository,
  TEST_NOTIFICATION_ID,
  TEST_USER_ID,
} from 'src/domain/notifications/application/testing/notification.fixtures';
import { NotificationNotFoundError } from 'src/domain/notifications/application/notifications.errors';
import { FindNotificationQuery } from './find-notification.query';
import { FindNotificationUseCase } from './find-notification.use-case';

describe('FindNotificationUseCase', () => {
  it("returns the current user's notification", async () => {
    const repository = createMockNotificationsRepository();
    repository.findById.mockResolvedValue(aNotification());
    const useCase = new FindNotificationUseCase(
      repository,
      createMockContextService(),
    );

    await expect(
      useCase.execute(new FindNotificationQuery(TEST_NOTIFICATION_ID)),
    ).resolves.toEqual(aNotification());
    expect(repository.findById).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_NOTIFICATION_ID,
    );
  });

  it("answers another user's or a missing notification with not found", async () => {
    const repository = createMockNotificationsRepository();
    const useCase = new FindNotificationUseCase(
      repository,
      createMockContextService(),
    );

    await expect(
      useCase.execute(new FindNotificationQuery(TEST_NOTIFICATION_ID)),
    ).rejects.toThrow(NotificationNotFoundError);
  });

  it('requires a signed-in user', async () => {
    const repository = createMockNotificationsRepository();
    const useCase = new FindNotificationUseCase(
      repository,
      createMockContextService({}),
    );

    await expect(
      useCase.execute(new FindNotificationQuery(TEST_NOTIFICATION_ID)),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(repository.findById).not.toHaveBeenCalled();
  });
});
