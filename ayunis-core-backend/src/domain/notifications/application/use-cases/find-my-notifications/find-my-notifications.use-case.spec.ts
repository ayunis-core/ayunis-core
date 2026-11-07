import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { Paginated } from 'src/common/pagination/paginated.entity';
import {
  aNotification,
  createMockNotificationsRepository,
  TEST_USER_ID,
} from 'src/domain/notifications/application/testing/notification.fixtures';
import { FindMyNotificationsQuery } from './find-my-notifications.query';
import { FindMyNotificationsUseCase } from './find-my-notifications.use-case';

describe('FindMyNotificationsUseCase', () => {
  it("returns a page of the current user's notifications", async () => {
    const repository = createMockNotificationsRepository();
    const page = new Paginated({
      data: [aNotification()],
      limit: 20,
      offset: 20,
      total: 21,
    });
    repository.findPageByUserId.mockResolvedValue(page);
    const useCase = new FindMyNotificationsUseCase(
      repository,
      createMockContextService(),
    );

    await expect(
      useCase.execute(new FindMyNotificationsQuery({ limit: 20, offset: 20 })),
    ).resolves.toBe(page);
    expect(repository.findPageByUserId).toHaveBeenCalledWith(TEST_USER_ID, {
      limit: 20,
      offset: 20,
    });
  });
});
