import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import {
  createMockNotificationsRepository,
  TEST_USER_ID,
} from 'src/domain/notifications/application/testing/notification.fixtures';
import { CountUnreadNotificationsUseCase } from './count-unread-notifications.use-case';

describe('CountUnreadNotificationsUseCase', () => {
  it("counts the current user's unread notifications", async () => {
    const repository = createMockNotificationsRepository();
    repository.countUnread.mockResolvedValue(4);
    const useCase = new CountUnreadNotificationsUseCase(
      repository,
      createMockContextService(),
    );

    await expect(useCase.execute()).resolves.toBe(4);
    expect(repository.countUnread).toHaveBeenCalledWith(TEST_USER_ID);
  });
});
