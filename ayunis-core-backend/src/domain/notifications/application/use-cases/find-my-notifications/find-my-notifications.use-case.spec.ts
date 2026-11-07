import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { Paginated } from 'src/common/pagination/paginated.entity';
import {
  aNotification,
  createMockNotificationsRepository,
  TEST_ROUTINE_ID,
  TEST_USER_ID,
} from 'src/domain/notifications/application/testing/notification.fixtures';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
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
    expect(repository.findPageByUserId).toHaveBeenCalledWith(
      TEST_USER_ID,
      { limit: 20, offset: 20 },
      { routineId: undefined, type: undefined },
    );
  });

  it("narrows the current user's notifications to one routine", async () => {
    const repository = createMockNotificationsRepository();
    const useCase = new FindMyNotificationsUseCase(
      repository,
      createMockContextService(),
    );

    await useCase.execute(
      new FindMyNotificationsQuery({
        limit: 20,
        offset: 0,
        routineId: TEST_ROUTINE_ID,
      }),
    );

    expect(repository.findPageByUserId).toHaveBeenCalledWith(
      TEST_USER_ID,
      { limit: 20, offset: 0 },
      { routineId: TEST_ROUTINE_ID, type: undefined },
    );
  });

  it("narrows the current user's notifications to one type", async () => {
    const repository = createMockNotificationsRepository();
    const useCase = new FindMyNotificationsUseCase(
      repository,
      createMockContextService(),
    );

    await useCase.execute(
      new FindMyNotificationsQuery({
        limit: 20,
        offset: 0,
        type: NotificationType.ROUTINE_ERROR,
      }),
    );

    expect(repository.findPageByUserId).toHaveBeenCalledWith(
      TEST_USER_ID,
      { limit: 20, offset: 0 },
      { routineId: undefined, type: NotificationType.ROUTINE_ERROR },
    );
  });
});
