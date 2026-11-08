import type { UUID } from 'crypto';
import { createMockNotificationsRepository } from 'src/domain/notifications/application/testing/notification.fixtures';
import { UpdateReleaseNoteNotificationsCommand } from './update-release-note-notifications.command';
import { UpdateReleaseNoteNotificationsUseCase } from './update-release-note-notifications.use-case';

describe('UpdateReleaseNoteNotificationsUseCase', () => {
  it('updates the notifications of the release note and creates none', async () => {
    const repository = createMockNotificationsRepository();
    repository.updateReleaseNoteNotifications.mockResolvedValue(1834);
    const useCase = new UpdateReleaseNoteNotificationsUseCase(repository);
    const content = {
      releaseNoteId: '55555555-5555-4555-8555-555555555555' as UUID,
      headline: 'Routinen sind da – jetzt für alle',
      body: 'Ab sofort für alle Organisationen.',
      media: null,
    };

    await expect(
      useCase.execute(new UpdateReleaseNoteNotificationsCommand(content)),
    ).resolves.toBe(1834);
    expect(repository.updateReleaseNoteNotifications).toHaveBeenCalledWith(
      expect.objectContaining(content),
    );
    expect(repository.createReleaseNoteNotifications).not.toHaveBeenCalled();
  });
});
