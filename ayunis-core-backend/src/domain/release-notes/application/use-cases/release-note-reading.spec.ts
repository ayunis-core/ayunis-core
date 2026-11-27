import { Readable } from 'stream';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import {
  ReleaseNoteImageNotFoundError,
  ReleaseNoteNotFoundError,
} from 'src/domain/release-notes/application/release-notes.errors';
import {
  aReleaseNote,
  InMemoryReleaseNotesRepository,
  TEST_LOOM_URL,
  TEST_RELEASE_NOTE_ID,
} from 'src/domain/release-notes/application/testing/release-note.fixtures';
import { ReleaseNoteAttentionMechanism } from 'src/domain/release-notes/domain/release-note-attention-mechanism';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import type { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { CountUnreadReleaseNotesUseCase } from './count-unread-release-notes/count-unread-release-notes.use-case';
import { DownloadReleaseNoteImageQuery } from './download-release-note-image/download-release-note-image.query';
import { DownloadReleaseNoteImageUseCase } from './download-release-note-image/download-release-note-image.use-case';
import { FindInstantOpenReleaseNoteUseCase } from './find-instant-open-release-note/find-instant-open-release-note.use-case';
import { FindMyReleaseNotesUseCase } from './find-my-release-notes/find-my-release-notes.use-case';
import { FindReleaseNoteQuery } from './find-release-note/find-release-note.query';
import { FindReleaseNoteUseCase } from './find-release-note/find-release-note.use-case';
import { MarkReleaseNoteReadCommand } from './mark-release-note-read/mark-release-note-read.command';
import { MarkReleaseNoteReadUseCase } from './mark-release-note-read/mark-release-note-read.use-case';

const OLD_NEWS_ID = '99999999-9999-4999-8999-999999999999' as const;
const IMAGE = {
  type: NotificationMediaType.IMAGE as const,
  storageKey: 'release-notes/c76cd1b4/0123456789abcdef.webp',
  contentType: 'image/webp',
};

/** An announced note with an image and an older note that never was. */
async function setup(contextService = createMockContextService()) {
  const repository = new InMemoryReleaseNotesRepository();
  await repository.insertMany([
    aReleaseNote({
      announced: true,
      media: IMAGE,
      createdAt: new Date('2026-11-05T14:00:00.000Z'),
    }),
    aReleaseNote({
      id: OLD_NEWS_ID,
      announcableId: 'ba325d69-7c73-4cd6-b736-5892ea66a53b',
      headline: 'Webinar: Ayunis Core in 45 Minuten',
      media: { type: NotificationMediaType.LOOM, url: TEST_LOOM_URL },
      createdAt: new Date('2026-10-27T13:00:00.000Z'),
    }),
  ]);
  const downloadObject = {
    execute: jest.fn().mockResolvedValue(new Readable()),
  } as unknown as jest.Mocked<DownloadObjectUseCase>;
  return {
    repository,
    downloadObject,
    findMine: new FindMyReleaseNotesUseCase(repository, contextService),
    findOne: new FindReleaseNoteUseCase(repository, contextService),
    findInstantOpen: new FindInstantOpenReleaseNoteUseCase(
      repository,
      contextService,
    ),
    countUnread: new CountUnreadReleaseNotesUseCase(repository, contextService),
    markRead: new MarkReleaseNoteReadUseCase(repository, contextService),
    downloadImage: new DownloadReleaseNoteImageUseCase(
      repository,
      downloadObject,
      contextService,
    ),
  };
}

describe('reading release notes', () => {
  it('lists every note newest first with the read state of the current user', async () => {
    const { findMine, countUnread } = await setup();

    const notes = await findMine.execute();

    expect(notes.map(({ note, unread }) => [note.id, unread])).toEqual([
      [TEST_RELEASE_NOTE_ID, true],
      [OLD_NEWS_ID, false],
    ]);
    await expect(countUnread.execute()).resolves.toBe(1);
  });

  it('marks a note read for the current user and keeps it read', async () => {
    const { repository, findOne, countUnread, markRead } = await setup();
    const colleague = '22222222-2222-4222-8222-222222222222';

    await expect(
      markRead.execute(new MarkReleaseNoteReadCommand(TEST_RELEASE_NOTE_ID)),
    ).resolves.toMatchObject({ unread: false });
    await markRead.execute(
      new MarkReleaseNoteReadCommand(TEST_RELEASE_NOTE_ID),
    );

    await expect(
      findOne.execute(new FindReleaseNoteQuery(TEST_RELEASE_NOTE_ID)),
    ).resolves.toMatchObject({ unread: false });
    await expect(countUnread.execute()).resolves.toBe(0);
    await expect(repository.countUnread(colleague)).resolves.toBe(1);
  });

  it('opens only the newest instant-open note, and only while it is unread, so an older unread one never pops up', async () => {
    const { repository, findInstantOpen, markRead } = await setup();
    const newest = aReleaseNote({
      id: '33333333-3333-4333-8333-333333333333',
      announcableId: '0c77830d-8211-4cad-a159-0330c5ada41b',
      announced: true,
      attentionMechanism: ReleaseNoteAttentionMechanism.INSTANT_OPEN,
      publishedOn: '2026-11-20',
    });
    await repository.insertMany([
      aReleaseNote({
        id: '44444444-4444-4444-8444-444444444444',
        announcableId: 'e2e0c0de-7a2b-4c1d-9e8f-1a2b3c4d5e6f',
        announced: true,
        attentionMechanism: ReleaseNoteAttentionMechanism.INSTANT_OPEN,
        publishedOn: '2026-11-10',
      }),
      newest,
    ]);

    await expect(findInstantOpen.execute()).resolves.toMatchObject({
      unread: true,
      note: { id: newest.id },
    });

    await markRead.execute(new MarkReleaseNoteReadCommand(newest.id));

    await expect(findInstantOpen.execute()).resolves.toBeNull();
  });

  it('answers a note that does not exist with not found', async () => {
    const { findOne, markRead, downloadImage } = await setup();
    const missing = '88888888-8888-4888-8888-888888888888';

    await expect(
      findOne.execute(new FindReleaseNoteQuery(missing)),
    ).rejects.toThrow(ReleaseNoteNotFoundError);
    await expect(
      markRead.execute(new MarkReleaseNoteReadCommand(missing)),
    ).rejects.toThrow(ReleaseNoteNotFoundError);
    await expect(
      downloadImage.execute(new DownloadReleaseNoteImageQuery(missing)),
    ).rejects.toThrow(ReleaseNoteNotFoundError);
  });

  it('streams the image of a note with its content type', async () => {
    const { downloadObject, downloadImage } = await setup();
    const stream = new Readable();
    downloadObject.execute.mockResolvedValue(stream);

    await expect(
      downloadImage.execute(
        new DownloadReleaseNoteImageQuery(TEST_RELEASE_NOTE_ID),
      ),
    ).resolves.toEqual({
      stream,
      contentType: 'image/webp',
      filename: `${TEST_RELEASE_NOTE_ID}.webp`,
    });
    expect(downloadObject.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: IMAGE.storageKey }),
    );
  });

  it('answers a note with a Loom video, or whose image is gone, with image not found', async () => {
    const { downloadObject, downloadImage } = await setup();

    await expect(
      downloadImage.execute(new DownloadReleaseNoteImageQuery(OLD_NEWS_ID)),
    ).rejects.toThrow(ReleaseNoteImageNotFoundError);
    expect(downloadObject.execute).not.toHaveBeenCalled();

    downloadObject.execute.mockRejectedValue(
      new ObjectNotFoundError({ objectName: IMAGE.storageKey }),
    );
    await expect(
      downloadImage.execute(
        new DownloadReleaseNoteImageQuery(TEST_RELEASE_NOTE_ID),
      ),
    ).rejects.toThrow(ReleaseNoteImageNotFoundError);
  });

  it('requires a signed-in user', async () => {
    const {
      findMine,
      findOne,
      findInstantOpen,
      countUnread,
      markRead,
      downloadImage,
    } = await setup(createMockContextService({}));

    await expect(findMine.execute()).rejects.toThrow(UnauthorizedAccessError);
    await expect(findInstantOpen.execute()).rejects.toThrow(
      UnauthorizedAccessError,
    );
    await expect(countUnread.execute()).rejects.toThrow(
      UnauthorizedAccessError,
    );
    await expect(
      findOne.execute(new FindReleaseNoteQuery(TEST_RELEASE_NOTE_ID)),
    ).rejects.toThrow(UnauthorizedAccessError);
    await expect(
      markRead.execute(new MarkReleaseNoteReadCommand(TEST_RELEASE_NOTE_ID)),
    ).rejects.toThrow(UnauthorizedAccessError);
    await expect(
      downloadImage.execute(
        new DownloadReleaseNoteImageQuery(TEST_RELEASE_NOTE_ID),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
