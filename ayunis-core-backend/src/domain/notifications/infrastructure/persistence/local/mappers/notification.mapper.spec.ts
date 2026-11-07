import { aNotification } from 'src/domain/notifications/application/testing/notification.fixtures';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import { NotificationMapper } from './notification.mapper';

describe('NotificationMapper', () => {
  const mapper = new NotificationMapper();

  it('keeps every field through a record round trip', () => {
    const notification = aNotification({
      readAt: new Date('2026-11-07T09:00:00.000Z'),
    });

    expect(mapper.toDomain(mapper.toRecord(notification))).toEqual(
      notification,
    );
  });

  it.each([
    [
      'an image',
      {
        type: NotificationMediaType.IMAGE,
        storageKey: 'release-notes/routinen-sind-da.png',
        contentType: 'image/png',
      },
    ],
    [
      'a Loom video',
      {
        type: NotificationMediaType.LOOM,
        url: 'https://www.loom.com/embed/4f7c2d9e1b8a4c6d9e2f1a3b5c7d9e0f',
      },
    ],
  ] as const)(
    'keeps a release note without subheadline and with %s',
    (_label, media) => {
      const notification = aNotification({
        type: NotificationType.RELEASE_NOTE,
        subheadline: null,
        media,
        routineId: null,
        routineThreadId: null,
        releaseNoteId: '55555555-5555-4555-8555-555555555555',
      });

      expect(mapper.toDomain(mapper.toRecord(notification))).toEqual(
        notification,
      );
    },
  );
});
