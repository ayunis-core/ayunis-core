import type { UUID } from 'crypto';
import { createMockNotificationsRepository } from 'src/domain/notifications/application/testing/notification.fixtures';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import { NotifyUsersOfReleaseNoteCommand } from './notify-users-of-release-note.command';
import { NotifyUsersOfReleaseNoteUseCase } from './notify-users-of-release-note.use-case';

describe('NotifyUsersOfReleaseNoteUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-11-07T18:00:00.000Z') });
  });

  afterEach(() => jest.useRealTimers());

  it('sends the release note to all users at once and returns how many got it', async () => {
    const repository = createMockNotificationsRepository();
    repository.createReleaseNoteNotifications.mockResolvedValue(1834);
    const useCase = new NotifyUsersOfReleaseNoteUseCase(repository);
    const content = {
      releaseNoteId: '55555555-5555-4555-8555-555555555555' as UUID,
      headline: 'Routinen sind da',
      body: 'Ayunis erledigt wiederkehrende Recherchen jetzt automatisch.',
      media: {
        type: NotificationMediaType.LOOM,
        url: 'https://www.loom.com/embed/198aa66c0e684eb891a4a6d4ee74512d',
      },
    } as const;

    await expect(
      useCase.execute(new NotifyUsersOfReleaseNoteCommand(content)),
    ).resolves.toBe(1834);
    expect(repository.createReleaseNoteNotifications).toHaveBeenCalledTimes(1);
    expect(repository.createReleaseNoteNotifications).toHaveBeenCalledWith(
      expect.objectContaining(content),
      new Date('2026-11-07T18:00:00.000Z'),
    );
  });
});
