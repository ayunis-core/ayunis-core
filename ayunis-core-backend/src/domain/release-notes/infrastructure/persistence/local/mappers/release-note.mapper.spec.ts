import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import {
  aReleaseNote,
  TEST_IMAGE_PATH,
  TEST_LOOM_URL,
} from 'src/domain/release-notes/application/testing/release-note.fixtures';
import { ReleaseNoteMapper } from './release-note.mapper';

describe('ReleaseNoteMapper', () => {
  const mapper = new ReleaseNoteMapper();

  it.each([
    [
      'a stored image',
      aReleaseNote({
        media: {
          type: NotificationMediaType.IMAGE,
          storageKey:
            'release-notes/c76cd1b4-3b80-4666-bc4f-913161122056/0123456789abcdef.webp',
          contentType: 'image/webp',
        },
        imageSourcePath: TEST_IMAGE_PATH,
      }),
    ],
    [
      'a Loom video',
      aReleaseNote({
        media: { type: NotificationMediaType.LOOM, url: TEST_LOOM_URL },
      }),
    ],
    ['no media', aReleaseNote()],
  ])('keeps every field of a note with %s', (_label, note) => {
    expect(mapper.toDomain(mapper.toRecord(note))).toEqual(note);
  });

  it('fills only the media columns of the note’s kind of media', () => {
    const record = mapper.toRecord(
      aReleaseNote({
        media: { type: NotificationMediaType.LOOM, url: TEST_LOOM_URL },
      }),
    );

    expect(record).toMatchObject({
      mediaType: NotificationMediaType.LOOM,
      mediaUrl: TEST_LOOM_URL,
      mediaStorageKey: null,
      mediaContentType: null,
    });
  });
});
