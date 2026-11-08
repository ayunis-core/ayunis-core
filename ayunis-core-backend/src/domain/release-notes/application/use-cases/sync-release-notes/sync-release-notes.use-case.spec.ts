jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
import type { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import { AnnouncableFeedInvalidError } from 'src/domain/release-notes/application/release-notes.errors';
import { ReleaseNoteMediaService } from 'src/domain/release-notes/application/services/release-note-media.service';
import {
  anAnnouncableNote,
  createMockAnnouncableFeed,
  InMemoryReleaseNoteInbox,
  InMemoryReleaseNotesRepository,
  TEST_ANNOUNCABLE_ID,
  TEST_ANNOUNCABLE_ORG_ID,
  TEST_IMAGE_PATH,
  TEST_IMAGE_SRC,
  TEST_LOOM_URL,
} from 'src/domain/release-notes/application/testing/release-note.fixtures';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import type { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import type { ListObjectsUseCase } from 'src/domain/storage/application/use-cases/list-objects/list-objects.use-case';
import type { UploadSystemObjectUseCase } from 'src/domain/storage/application/use-cases/upload-system-object/upload-system-object.use-case';
import { StorageObject } from 'src/domain/storage/domain/storage-object.entity';
import { SyncReleaseNotesUseCase } from './sync-release-notes.use-case';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const WEBINAR_ID = 'ba325d69-7c73-4cd6-b736-5892ea66a53b';
const VIDEO_ID = '0c77830d-8211-4cad-a159-0330c5ada41b';

/** Object storage as the storage use cases expose it, kept in memory. */
function objectStore() {
  const objects = new Map<string, Buffer>();
  const upload = {
    execute: jest.fn((command: { objectName: string; data: Buffer }) => {
      objects.set(command.objectName, command.data);
      return Promise.resolve(
        new StorageObject(command.objectName, 'documents', 1, 'etag'),
      );
    }),
  };
  const list = {
    execute: jest.fn(({ prefix }: { prefix: string }) =>
      Promise.resolve(
        [...objects.keys()].filter((key) => key.startsWith(prefix)),
      ),
    ),
  };
  const remove = {
    execute: jest.fn(({ objectName }: { objectName: string }) => {
      if (!objects.delete(objectName)) {
        return Promise.reject(new ObjectNotFoundError({ objectName }));
      }
      return Promise.resolve();
    }),
  };
  return { objects, upload, list, remove };
}

/** `releaseNotesEnabled` needs routines on and an Announcable org ID. */
function setup({ releaseNotesEnabled = true } = {}) {
  const config: Record<string, unknown> = {
    'features.releaseNotesEnabled': releaseNotesEnabled,
    'releaseNotes.announcableOrgId': TEST_ANNOUNCABLE_ORG_ID,
  };
  const feed = createMockAnnouncableFeed();
  feed.downloadImage.mockResolvedValue({ status: 'downloaded', data: PNG });
  const repository = new InMemoryReleaseNotesRepository();
  const inbox = new InMemoryReleaseNoteInbox();
  const deleteByIds = repository.deleteByIds.bind(repository);
  repository.deleteByIds = (ids) => {
    inbox.releaseNotesDeleted(ids);
    return deleteByIds(ids);
  };
  const storage = objectStore();
  const useCase = new SyncReleaseNotesUseCase(
    { get: (key: string) => config[key] } as unknown as ConfigService,
    feed,
    repository,
    new ReleaseNoteMediaService(
      feed,
      storage.upload as unknown as UploadSystemObjectUseCase,
      storage.list as unknown as ListObjectsUseCase,
      storage.remove as unknown as DeleteObjectUseCase,
    ),
    inbox.notifyUsers,
    inbox.updateNotifications,
  );
  return { feed, repository, inbox, storage, useCase };
}

const imageNote = anAnnouncableNote({ imageSrc: TEST_IMAGE_SRC });
const webinarNote = anAnnouncableNote({
  id: WEBINAR_ID,
  title: 'Webinar: Ayunis Core in 45 Minuten',
  text: 'Es gibt mehrere Termine zur Auswahl.',
  lastUpdateOn: '2026-10-27 13:55:42.151507 +0000 UTC',
  ctaLabelOverride: 'Zur Anmeldung',
  ctaHrefOverride: 'https://app.livestorm.co/locaboo/ayunis-core-einstieg',
});
const videoNote = anAnnouncableNote({
  id: VIDEO_ID,
  title: 'Fähigkeiten mit einem Klick verbessern',
  text: 'Fähigkeiten lassen sich direkt im Formular verbessern.',
  lastUpdateOn: '2026-10-13 15:06:58.464389 +0000 UTC',
  mediaLink: TEST_LOOM_URL,
});

describe('SyncReleaseNotesUseCase', () => {
  it('makes no request to Announcable without release notes (no Announcable org ID or routines off)', async () => {
    const { feed, repository, inbox, useCase } = setup({
      releaseNotesEnabled: false,
    });

    await expect(useCase.execute()).resolves.toBeNull();

    expect(feed.fetchReleaseNotes).not.toHaveBeenCalled();
    expect(repository.notes.size).toBe(0);
    expect(inbox.notifications).toHaveLength(0);
  });

  it('stores every note of the feed with headline, body, link and media', async () => {
    const { feed, repository, storage, useCase } = setup();
    feed.fetchReleaseNotes.mockResolvedValue([
      imageNote,
      webinarNote,
      videoNote,
    ]);

    const result = await useCase.execute();

    expect(feed.fetchReleaseNotes).toHaveBeenCalledWith(
      TEST_ANNOUNCABLE_ORG_ID,
    );
    expect(result).toMatchObject({ inserted: 3, updated: 0, deleted: 0 });
    const image = repository.byAnnouncableId(TEST_ANNOUNCABLE_ID);
    expect(image).toMatchObject({
      headline: imageNote.title,
      body: imageNote.text,
      imageSourcePath: TEST_IMAGE_PATH,
      media: { type: NotificationMediaType.IMAGE, contentType: 'image/png' },
    });
    expect(
      storage.objects.get((image?.media as { storageKey: string }).storageKey),
    ).toEqual(PNG);
    expect(repository.byAnnouncableId(WEBINAR_ID)).toMatchObject({
      headline: 'Webinar: Ayunis Core in 45 Minuten',
      body: 'Es gibt mehrere Termine zur Auswahl.\n\n[Zur Anmeldung](https://app.livestorm.co/locaboo/ayunis-core-einstieg)',
      media: null,
    });
    expect(repository.byAnnouncableId(VIDEO_ID)).toMatchObject({
      media: { type: NotificationMediaType.LOOM, url: TEST_LOOM_URL },
    });
  });

  it('changes nothing when Announcable has not changed', async () => {
    const { feed, repository, storage, useCase } = setup();
    feed.fetchReleaseNotes.mockResolvedValue([imageNote, webinarNote]);
    await useCase.execute();
    const before = [...repository.notes.values()];
    const storedObjects = [...storage.objects.keys()];
    feed.downloadImage.mockClear();
    const update = jest.spyOn(repository, 'update');

    const result = await useCase.execute();

    expect(result).toMatchObject({
      inserted: 0,
      updated: 0,
      deleted: 0,
      unchanged: 2,
    });
    expect([...repository.notes.values()]).toEqual(before);
    expect([...storage.objects.keys()]).toEqual(storedObjects);
    expect(feed.downloadImage).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('updates an edited note in place without downloading its unchanged image', async () => {
    const { feed, repository, storage, useCase } = setup();
    feed.fetchReleaseNotes.mockResolvedValue([imageNote]);
    await useCase.execute();
    const original = repository.byAnnouncableId(TEST_ANNOUNCABLE_ID);
    feed.downloadImage.mockClear();
    feed.fetchReleaseNotes.mockResolvedValue([
      {
        ...imageNote,
        title: 'Auto und Max Modus – jetzt für alle',
        imageSrc: `${TEST_IMAGE_PATH}?X-Amz-Signature=signed-an-hour-later`,
        lastUpdateOn: '2026-11-06 09:00:00.000001 +0000 UTC',
      },
    ]);

    const result = await useCase.execute();

    expect(result).toMatchObject({ inserted: 0, updated: 1 });
    expect(repository.notes.size).toBe(1);
    expect(repository.byAnnouncableId(TEST_ANNOUNCABLE_ID)).toEqual({
      ...original,
      headline: 'Auto und Max Modus – jetzt für alle',
      lastUpdateOn: '2026-11-06 09:00:00.000001 +0000 UTC',
    });
    expect(feed.downloadImage).not.toHaveBeenCalled();
    expect(storage.objects.size).toBe(1);
  });

  it('replaces the stored image when the image changed, leaving no old image behind', async () => {
    const { feed, repository, storage, useCase } = setup();
    feed.fetchReleaseNotes.mockResolvedValue([imageNote]);
    await useCase.execute();
    const oldKey = (
      repository.byAnnouncableId(TEST_ANNOUNCABLE_ID)?.media as {
        storageKey: string;
      }
    ).storageKey;
    const newSrc = TEST_IMAGE_SRC.replace('ba4574f9', 'd2e8a1c0');
    feed.fetchReleaseNotes.mockResolvedValue([
      {
        ...imageNote,
        imageSrc: newSrc,
        lastUpdateOn: '2026-11-06 10:00:00 +0000 UTC',
      },
    ]);

    await useCase.execute();

    const note = repository.byAnnouncableId(TEST_ANNOUNCABLE_ID);
    const newKey = (note?.media as { storageKey: string }).storageKey;
    expect(feed.downloadImage).toHaveBeenLastCalledWith(newSrc);
    expect(newKey).not.toBe(oldKey);
    expect([...storage.objects.keys()]).toEqual([newKey]);
  });

  it('deletes a note Announcable no longer has, and its image', async () => {
    const { feed, repository, storage, useCase } = setup();
    feed.fetchReleaseNotes.mockResolvedValue([imageNote, webinarNote]);
    await useCase.execute();
    feed.fetchReleaseNotes.mockResolvedValue([webinarNote]);

    const result = await useCase.execute();

    expect(result).toMatchObject({ deleted: 1 });
    expect(repository.byAnnouncableId(TEST_ANNOUNCABLE_ID)).toBeUndefined();
    expect(repository.byAnnouncableId(WEBINAR_ID)).toBeDefined();
    expect(storage.objects.size).toBe(0);
  });

  it('skips a note that cannot become a notification and stores the others', async () => {
    const { feed, repository, useCase } = setup();
    feed.fetchReleaseNotes.mockResolvedValue([
      anAnnouncableNote({ title: 'A'.repeat(201) }),
      webinarNote,
    ]);

    const result = await useCase.execute();

    expect(result).toMatchObject({ inserted: 1, skipped: 1 });
    expect(repository.byAnnouncableId(TEST_ANNOUNCABLE_ID)).toBeUndefined();
  });

  it('keeps the stored version and its image when an edit cannot become a notification', async () => {
    const { feed, repository, storage, useCase } = setup();
    feed.fetchReleaseNotes.mockResolvedValue([imageNote]);
    await useCase.execute();
    const stored = repository.byAnnouncableId(TEST_ANNOUNCABLE_ID);
    feed.fetchReleaseNotes.mockResolvedValue([
      {
        ...imageNote,
        title: ' ',
        lastUpdateOn: '2026-11-06 11:00:00 +0000 UTC',
      },
    ]);

    const result = await useCase.execute();

    expect(result).toMatchObject({ updated: 0, skipped: 1, deleted: 0 });
    expect(repository.byAnnouncableId(TEST_ANNOUNCABLE_ID)).toEqual(stored);
    expect(storage.objects.size).toBe(1);
  });

  it('changes nothing when the feed cannot be read', async () => {
    const { feed, repository, useCase } = setup();
    feed.fetchReleaseNotes.mockResolvedValue([imageNote]);
    await useCase.execute();
    feed.fetchReleaseNotes.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(useCase.execute()).rejects.toThrow();

    expect(repository.byAnnouncableId(TEST_ANNOUNCABLE_ID)).toBeDefined();
  });

  it('writes nothing when an image cannot be downloaded right now', async () => {
    const { feed, repository, useCase } = setup();
    feed.fetchReleaseNotes.mockResolvedValue([webinarNote, imageNote]);
    feed.downloadImage.mockRejectedValue(new Error('connect ETIMEDOUT'));

    await expect(useCase.execute()).rejects.toThrow();

    expect(repository.notes.size).toBe(0);
  });

  describe('notifications', () => {
    it('records the notes of the first sync without notifying anyone', async () => {
      const { feed, repository, inbox, useCase } = setup();
      feed.fetchReleaseNotes.mockResolvedValue([imageNote, webinarNote]);

      const result = await useCase.execute();

      expect(result).toMatchObject({ inserted: 2, notified: 0 });
      expect(repository.notes.size).toBe(2);
      expect(inbox.notifications).toHaveLength(0);
    });

    it('sends a new note to every user, with its headline, body and media', async () => {
      const { feed, repository, inbox, useCase } = setup();
      feed.fetchReleaseNotes.mockResolvedValue([webinarNote]);
      await useCase.execute();
      feed.fetchReleaseNotes.mockResolvedValue([imageNote, webinarNote]);

      const result = await useCase.execute();

      expect(result).toMatchObject({ inserted: 1, notified: 2 });
      const note = repository.byAnnouncableId(TEST_ANNOUNCABLE_ID);
      expect(inbox.notifications).toEqual(
        inbox.users.map((userId) => ({
          userId,
          releaseNoteId: note?.id,
          headline: imageNote.title,
          body: imageNote.text,
          media: note?.media,
          readAt: null,
        })),
      );
      expect(note?.media).toMatchObject({ type: NotificationMediaType.IMAGE });
    });

    it('sends a note once, and not to users who joined after it arrived', async () => {
      const { feed, inbox, useCase } = setup();
      feed.fetchReleaseNotes.mockResolvedValue([webinarNote]);
      await useCase.execute();
      feed.fetchReleaseNotes.mockResolvedValue([imageNote, webinarNote]);
      await useCase.execute();
      const laterUser = randomUUID();
      inbox.users.push(laterUser);

      const result = await useCase.execute();

      expect(result).toMatchObject({ unchanged: 2, notified: 0 });
      expect(inbox.notifications).toHaveLength(2);
      expect(inbox.notifications.map((n) => n.userId)).not.toContain(laterUser);
    });

    it('shows an edit in the notes already sent, without sending it again or changing read state', async () => {
      const { feed, repository, inbox, useCase } = setup();
      feed.fetchReleaseNotes.mockResolvedValue([webinarNote]);
      await useCase.execute();
      feed.fetchReleaseNotes.mockResolvedValue([videoNote, webinarNote]);
      await useCase.execute();
      const noteId = repository.byAnnouncableId(VIDEO_ID)?.id as UUID;
      const readAt = new Date('2026-11-07T09:00:00.000Z');
      inbox.of(noteId)[0].readAt = readAt;
      feed.fetchReleaseNotes.mockResolvedValue([
        {
          ...videoNote,
          title: 'Fähigkeiten verbessern – jetzt mit Vorschau',
          text: 'Die Vorschau zeigt die Änderung vor dem Speichern.',
          mediaLink: '',
          imageSrc: TEST_IMAGE_SRC,
          lastUpdateOn: '2026-11-06 09:00:00 +0000 UTC',
        },
        webinarNote,
      ]);

      const result = await useCase.execute();

      expect(result).toMatchObject({ updated: 1, notified: 0 });
      const media = repository.byAnnouncableId(VIDEO_ID)?.media;
      expect(media).toMatchObject({ type: NotificationMediaType.IMAGE });
      expect(inbox.of(noteId)).toEqual([
        expect.objectContaining({
          headline: 'Fähigkeiten verbessern – jetzt mit Vorschau',
          body: 'Die Vorschau zeigt die Änderung vor dem Speichern.',
          media,
          readAt,
        }),
        expect.objectContaining({
          headline: 'Fähigkeiten verbessern – jetzt mit Vorschau',
          media,
          readAt: null,
        }),
      ]);
      expect(inbox.notifications).toHaveLength(2);
    });

    it('removes the notifications of a note Announcable no longer has', async () => {
      const { feed, inbox, useCase } = setup();
      feed.fetchReleaseNotes.mockResolvedValue([webinarNote]);
      await useCase.execute();
      feed.fetchReleaseNotes.mockResolvedValue([videoNote, webinarNote]);
      await useCase.execute();
      feed.fetchReleaseNotes.mockResolvedValue([webinarNote]);

      await useCase.execute();

      expect(inbox.notifications).toHaveLength(0);
    });

    it('changes nothing when the feed is empty while notes are stored', async () => {
      const { feed, repository, inbox, useCase } = setup();
      feed.fetchReleaseNotes.mockResolvedValue([webinarNote]);
      await useCase.execute();
      feed.fetchReleaseNotes.mockResolvedValue([videoNote, webinarNote]);
      await useCase.execute();
      feed.fetchReleaseNotes.mockResolvedValue([]);

      await expect(useCase.execute()).rejects.toThrow(
        AnnouncableFeedInvalidError,
      );

      expect(repository.notes.size).toBe(2);
      expect(inbox.notifications).toHaveLength(2);
    });

    it('accepts an empty feed while no notes are stored', async () => {
      const { feed, useCase } = setup();
      feed.fetchReleaseNotes.mockResolvedValue([]);

      await expect(useCase.execute()).resolves.toMatchObject({
        inserted: 0,
        deleted: 0,
      });
    });
  });
});
