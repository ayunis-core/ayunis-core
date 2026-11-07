import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import {
  createMockNotificationsRepository,
  TEST_USER_ID,
} from 'src/domain/notifications/application/testing/notification.fixtures';
import { MarkAllNotificationsReadUseCase } from './mark-all-notifications-read.use-case';

describe('MarkAllNotificationsReadUseCase', () => {
  it("marks all of the current user's notifications as read", async () => {
    const repository = createMockNotificationsRepository();
    repository.markAllRead.mockResolvedValue(2);
    const useCase = new MarkAllNotificationsReadUseCase(
      repository,
      createMockContextService(),
    );

    await useCase.execute();

    expect(repository.markAllRead).toHaveBeenCalledWith(
      TEST_USER_ID,
      expect.any(Date),
    );
  });
});
