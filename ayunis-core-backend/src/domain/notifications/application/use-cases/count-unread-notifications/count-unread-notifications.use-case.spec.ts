import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import {
  createMockNotificationsRepository,
  TEST_USER_ID,
} from 'src/domain/notifications/application/testing/notification.fixtures';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import { CountUnreadNotificationsUseCase } from './count-unread-notifications.use-case';

describe('CountUnreadNotificationsUseCase', () => {
  it("counts the current user's unread notifications in total and per type", async () => {
    const repository = createMockNotificationsRepository();
    const byType = [
      { type: NotificationType.ROUTINE, count: 3 },
      { type: NotificationType.ROUTINE_ERROR, count: 1 },
    ];
    repository.countUnreadByType.mockResolvedValue(byType);
    const useCase = new CountUnreadNotificationsUseCase(
      repository,
      createMockContextService(),
    );

    await expect(useCase.execute()).resolves.toMatchObject({
      total: 4,
      byType,
    });
    expect(repository.countUnreadByType).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it('counts zero when nothing is unread', async () => {
    const useCase = new CountUnreadNotificationsUseCase(
      createMockNotificationsRepository(),
      createMockContextService(),
    );

    await expect(useCase.execute()).resolves.toMatchObject({
      total: 0,
      byType: [],
    });
  });
});
