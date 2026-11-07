import { Readable } from 'stream';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import type { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import {
  aNotification,
  createMockNotificationsRepository,
  TEST_NOTIFICATION_ID,
  TEST_USER_ID,
} from 'src/domain/notifications/application/testing/notification.fixtures';
import {
  NotificationImageNotFoundError,
  NotificationNotFoundError,
} from 'src/domain/notifications/application/notifications.errors';
import type { NotificationMedia } from 'src/domain/notifications/domain/notification-media';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import { DownloadNotificationImageQuery } from './download-notification-image.query';
import { DownloadNotificationImageUseCase } from './download-notification-image.use-case';

const STORAGE_KEY = 'release-notes/routinen-sind-da.png';

function aReleaseNote(media: NotificationMedia | null) {
  return aNotification({
    type: NotificationType.RELEASE_NOTE,
    subheadline: null,
    media,
    routineId: null,
    routineThreadId: null,
  });
}

function setup(contextService = createMockContextService()) {
  const repository = createMockNotificationsRepository();
  const downloadObjectUseCase = {
    execute: jest.fn().mockResolvedValue(new Readable()),
  } as unknown as jest.Mocked<DownloadObjectUseCase>;
  const useCase = new DownloadNotificationImageUseCase(
    repository,
    downloadObjectUseCase,
    contextService,
  );
  return { repository, downloadObjectUseCase, useCase };
}

const query = () => new DownloadNotificationImageQuery(TEST_NOTIFICATION_ID);

describe('DownloadNotificationImageUseCase', () => {
  it("streams the image of the current user's notification with its content type", async () => {
    const { repository, downloadObjectUseCase, useCase } = setup();
    const stream = new Readable();
    repository.findById.mockResolvedValue(
      aReleaseNote({
        type: NotificationMediaType.IMAGE,
        storageKey: STORAGE_KEY,
        contentType: 'image/png',
      }),
    );
    downloadObjectUseCase.execute.mockResolvedValue(stream);

    await expect(useCase.execute(query())).resolves.toEqual({
      stream,
      contentType: 'image/png',
      filename: `${TEST_NOTIFICATION_ID}.png`,
    });
    expect(repository.findById).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_NOTIFICATION_ID,
    );
    expect(downloadObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: STORAGE_KEY }),
    );
  });

  it("answers another user's or a missing notification with not found", async () => {
    const { downloadObjectUseCase, useCase } = setup();

    await expect(useCase.execute(query())).rejects.toThrow(
      NotificationNotFoundError,
    );
    expect(downloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it.each([
    ['no media', null],
    [
      'a Loom video',
      {
        type: NotificationMediaType.LOOM,
        url: 'https://www.loom.com/embed/4f7c2d9e1b8a',
      },
    ],
    [
      'an image type outside the allow-list',
      {
        type: NotificationMediaType.IMAGE,
        storageKey: 'release-notes/a.svg',
        contentType: 'image/svg+xml',
      },
    ],
  ] as const)(
    'answers a notification with %s with image not found',
    async (_label, media) => {
      const { repository, downloadObjectUseCase, useCase } = setup();
      repository.findById.mockResolvedValue(aReleaseNote(media));

      await expect(useCase.execute(query())).rejects.toThrow(
        NotificationImageNotFoundError,
      );
      expect(downloadObjectUseCase.execute).not.toHaveBeenCalled();
    },
  );

  it('answers an image missing from storage with image not found, without the storage key', async () => {
    const { repository, downloadObjectUseCase, useCase } = setup();
    repository.findById.mockResolvedValue(
      aReleaseNote({
        type: NotificationMediaType.IMAGE,
        storageKey: STORAGE_KEY,
        contentType: 'image/png',
      }),
    );
    downloadObjectUseCase.execute.mockRejectedValue(
      new ObjectNotFoundError({ objectName: STORAGE_KEY }),
    );

    const error: unknown = await useCase.execute(query()).catch((e) => e);

    expect(error).toBeInstanceOf(NotificationImageNotFoundError);
    expect((error as Error).message).not.toContain(STORAGE_KEY);
  });

  it('requires a signed-in user', async () => {
    const { repository, useCase } = setup(createMockContextService({}));

    await expect(useCase.execute(query())).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(repository.findById).not.toHaveBeenCalled();
  });
});
