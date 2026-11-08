import type { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import type { ListObjectsUseCase } from 'src/domain/storage/application/use-cases/list-objects/list-objects.use-case';
import type { UploadSystemObjectUseCase } from 'src/domain/storage/application/use-cases/upload-system-object/upload-system-object.use-case';
import {
  DeleteFailedError,
  ObjectNotFoundError,
} from 'src/domain/storage/application/storage.errors';
import { StorageObject } from 'src/domain/storage/domain/storage-object.entity';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import {
  aReleaseNote,
  anAnnouncableNote,
  createMockAnnouncableFeed,
  TEST_ANNOUNCABLE_ID,
  TEST_IMAGE_PATH,
  TEST_IMAGE_SRC,
  TEST_LOOM_URL,
} from 'src/domain/release-notes/application/testing/release-note.fixtures';
import { ReleaseNoteMediaService } from './release-note-media.service';

const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0xe2, 0x07, 0x03, 0x00]),
  Buffer.from('WEBPVP8L'),
]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
const STORED_KEY = `release-notes/${TEST_ANNOUNCABLE_ID}/0123456789abcdef.webp`;

function setup() {
  const feed = createMockAnnouncableFeed();
  const uploadSystemObject = {
    execute: jest.fn((command: { objectName: string }) =>
      Promise.resolve(
        new StorageObject(command.objectName, 'documents', WEBP.length, 'etag'),
      ),
    ),
  };
  const listObjects = { execute: jest.fn().mockResolvedValue([]) };
  const deleteObject = { execute: jest.fn().mockResolvedValue(undefined) };
  const service = new ReleaseNoteMediaService(
    feed,
    uploadSystemObject as unknown as UploadSystemObjectUseCase,
    listObjects as unknown as ListObjectsUseCase,
    deleteObject as unknown as DeleteObjectUseCase,
  );
  return { feed, uploadSystemObject, listObjects, deleteObject, service };
}

describe('ReleaseNoteMediaService', () => {
  describe('resolve', () => {
    it('embeds the Loom video of a note without downloading anything', async () => {
      const { feed, service } = setup();

      const resolved = await service.resolve(
        anAnnouncableNote({
          mediaLink: TEST_LOOM_URL,
          imageSrc: TEST_IMAGE_SRC,
        }),
        null,
      );

      expect(resolved).toEqual({
        media: { type: NotificationMediaType.LOOM, url: TEST_LOOM_URL },
        imageSourcePath: null,
      });
      expect(feed.downloadImage).not.toHaveBeenCalled();
    });

    it('drops a Loom link that is not an embed URL', async () => {
      const { service } = setup();

      const resolved = await service.resolve(
        anAnnouncableNote({
          mediaLink:
            'https://www.loom.com/share/198aa66c0e684eb891a4a6d4ee74512d',
        }),
        null,
      );

      expect(resolved).toEqual({ media: null, imageSourcePath: null });
    });

    it('falls back to the image when the Loom link is not an embed URL', async () => {
      const { feed, service } = setup();
      feed.downloadImage.mockResolvedValue({
        status: 'downloaded',
        data: WEBP,
      });

      const resolved = await service.resolve(
        anAnnouncableNote({
          mediaLink:
            'https://www.loom.com/share/198aa66c0e684eb891a4a6d4ee74512d',
          imageSrc: TEST_IMAGE_SRC,
        }),
        null,
      );

      expect(resolved).toMatchObject({
        media: { type: NotificationMediaType.IMAGE, contentType: 'image/webp' },
        imageSourcePath: TEST_IMAGE_PATH,
      });
    });

    it('stores the image of a note under the release-note prefix with its sniffed type', async () => {
      const { feed, uploadSystemObject, service } = setup();
      feed.downloadImage.mockResolvedValue({
        status: 'downloaded',
        data: WEBP,
      });

      const resolved = await service.resolve(
        anAnnouncableNote({ imageSrc: TEST_IMAGE_SRC }),
        null,
      );

      expect(feed.downloadImage).toHaveBeenCalledWith(TEST_IMAGE_SRC);
      expect(resolved).toEqual({
        media: {
          type: NotificationMediaType.IMAGE,
          storageKey: expect.stringMatching(
            new RegExp(
              `^release-notes/${TEST_ANNOUNCABLE_ID}/[0-9a-f]{16}\\.webp$`,
            ),
          ),
          contentType: 'image/webp',
        },
        imageSourcePath: TEST_IMAGE_PATH,
      });
      expect(uploadSystemObject.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          objectName: (resolved.media as { storageKey: string }).storageKey,
          data: WEBP,
          options: { contentType: 'image/webp' },
        }),
      );
    });

    it('keeps the stored image while the image path stays the same', async () => {
      const { feed, service } = setup();
      const media = {
        type: NotificationMediaType.IMAGE as const,
        storageKey: STORED_KEY,
        contentType: 'image/webp',
      };

      const resolved = await service.resolve(
        anAnnouncableNote({
          imageSrc: `${TEST_IMAGE_PATH}?X-Amz-Signature=a-newer-signature`,
        }),
        aReleaseNote({ media, imageSourcePath: TEST_IMAGE_PATH }),
      );

      expect(resolved).toEqual({ media, imageSourcePath: TEST_IMAGE_PATH });
      expect(feed.downloadImage).not.toHaveBeenCalled();
    });

    it('downloads the image again when its path changed', async () => {
      const { feed, service } = setup();
      feed.downloadImage.mockResolvedValue({
        status: 'downloaded',
        data: WEBP,
      });
      const newSrc = TEST_IMAGE_SRC.replace('ba4574f9', 'd2e8a1c0');

      const resolved = await service.resolve(
        anAnnouncableNote({ imageSrc: newSrc }),
        aReleaseNote({
          media: {
            type: NotificationMediaType.IMAGE,
            storageKey: STORED_KEY,
            contentType: 'image/webp',
          },
          imageSourcePath: TEST_IMAGE_PATH,
        }),
      );

      expect(feed.downloadImage).toHaveBeenCalledWith(newSrc);
      expect(resolved.imageSourcePath).toBe(
        TEST_IMAGE_PATH.replace('ba4574f9', 'd2e8a1c0'),
      );
      expect(resolved.media).toMatchObject({ contentType: 'image/webp' });
      expect(resolved.media).not.toMatchObject({ storageKey: STORED_KEY });
    });

    it('stores a note without an image Announcable refuses to send', async () => {
      const { feed, uploadSystemObject, service } = setup();
      feed.downloadImage.mockResolvedValue({
        status: 'rejected',
        reason: 'Announcable answered 403',
      });

      const resolved = await service.resolve(
        anAnnouncableNote({ imageSrc: TEST_IMAGE_SRC }),
        null,
      );

      expect(resolved).toEqual({ media: null, imageSourcePath: null });
      expect(uploadSystemObject.execute).not.toHaveBeenCalled();
    });

    it('stores a note without an image of an unsupported type', async () => {
      const { feed, uploadSystemObject, service } = setup();
      feed.downloadImage.mockResolvedValue({ status: 'downloaded', data: SVG });

      const resolved = await service.resolve(
        anAnnouncableNote({ imageSrc: TEST_IMAGE_SRC }),
        null,
      );

      expect(resolved).toEqual({ media: null, imageSourcePath: null });
      expect(uploadSystemObject.execute).not.toHaveBeenCalled();
    });

    it('fails when the image cannot be downloaded right now, so the next sync retries', async () => {
      const { feed, service } = setup();
      feed.downloadImage.mockRejectedValue(new Error('connect ETIMEDOUT'));

      await expect(
        service.resolve(anAnnouncableNote({ imageSrc: TEST_IMAGE_SRC }), null),
      ).rejects.toThrow('connect ETIMEDOUT');
    });

    it('has no media for a note without image and video', async () => {
      const { service } = setup();

      await expect(service.resolve(anAnnouncableNote(), null)).resolves.toEqual(
        { media: null, imageSourcePath: null },
      );
    });
  });

  describe('removeUnusedImages', () => {
    const keptKey = STORED_KEY;
    const replacedKey = `release-notes/${TEST_ANNOUNCABLE_ID}/fedcba9876543210.webp`;
    const deletedNoteKey =
      'release-notes/ba325d69-7c73-4cd6-b736-5892ea66a53b/00aa11bb22cc33dd.png';
    const kept = [
      aReleaseNote({
        media: {
          type: NotificationMediaType.IMAGE,
          storageKey: keptKey,
          contentType: 'image/webp',
        },
        imageSourcePath: TEST_IMAGE_PATH,
      }),
      aReleaseNote({
        announcableId: '0c77830d-8211-4cad-a159-0330c5ada41b',
        media: { type: NotificationMediaType.LOOM, url: TEST_LOOM_URL },
      }),
    ];

    it('deletes every stored release-note image no kept note uses', async () => {
      const { listObjects, deleteObject, service } = setup();
      listObjects.execute.mockResolvedValue([
        keptKey,
        replacedKey,
        deletedNoteKey,
      ]);

      await service.removeUnusedImages(kept);

      expect(listObjects.execute).toHaveBeenCalledWith(
        expect.objectContaining({ prefix: 'release-notes/' }),
      );
      const deleted = deleteObject.execute.mock.calls.map(
        ([command]) => (command as { objectName: string }).objectName,
      );
      expect(deleted).toEqual([replacedKey, deletedNoteKey]);
    });

    it('keeps deleting after an image could not be deleted', async () => {
      const { listObjects, deleteObject, service } = setup();
      listObjects.execute.mockResolvedValue([replacedKey, deletedNoteKey]);
      deleteObject.execute
        .mockRejectedValueOnce(new DeleteFailedError())
        .mockRejectedValueOnce(
          new ObjectNotFoundError({ objectName: deletedNoteKey }),
        );

      await expect(service.removeUnusedImages(kept)).resolves.toBeUndefined();
      expect(deleteObject.execute).toHaveBeenCalledTimes(2);
    });

    it('leaves the images for the next sync when they cannot be listed', async () => {
      const { listObjects, deleteObject, service } = setup();
      listObjects.execute.mockRejectedValue(new Error('connect ECONNREFUSED'));

      await expect(service.removeUnusedImages(kept)).resolves.toBeUndefined();
      expect(deleteObject.execute).not.toHaveBeenCalled();
    });
  });
});
