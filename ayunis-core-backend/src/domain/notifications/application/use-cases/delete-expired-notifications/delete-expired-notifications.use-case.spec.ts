import {
  createMockNotificationsRepository,
  TEST_ORG_ID,
} from 'src/domain/notifications/application/testing/notification.fixtures';
import { DeleteExpiredNotificationsCommand } from './delete-expired-notifications.command';
import { DeleteExpiredNotificationsUseCase } from './delete-expired-notifications.use-case';

describe('DeleteExpiredNotificationsUseCase', () => {
  const cutoff = new Date('2026-08-09T04:00:00.000Z');

  it("deletes the org's notifications created before the cutoff", async () => {
    const repository = createMockNotificationsRepository();
    repository.deleteByOrgCreatedBefore.mockResolvedValue(12);
    const useCase = new DeleteExpiredNotificationsUseCase(repository);

    await expect(
      useCase.execute(
        new DeleteExpiredNotificationsCommand({
          orgId: TEST_ORG_ID,
          createdBefore: cutoff,
          dryRun: false,
        }),
      ),
    ).resolves.toBe(12);
    expect(repository.deleteByOrgCreatedBefore).toHaveBeenCalledWith(
      TEST_ORG_ID,
      cutoff,
    );
  });

  it('only counts them in a dry run', async () => {
    const repository = createMockNotificationsRepository();
    repository.countByOrgCreatedBefore.mockResolvedValue(12);
    const useCase = new DeleteExpiredNotificationsUseCase(repository);

    await expect(
      useCase.execute(
        new DeleteExpiredNotificationsCommand({
          orgId: TEST_ORG_ID,
          createdBefore: cutoff,
          dryRun: true,
        }),
      ),
    ).resolves.toBe(12);
    expect(repository.deleteByOrgCreatedBefore).not.toHaveBeenCalled();
  });
});
