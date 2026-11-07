import type { UUID } from 'crypto';
import type { ReleaseNoteNotificationContent } from 'src/domain/notifications/application/models/release-note-notification-content';
import type { NotificationMedia } from 'src/domain/notifications/domain/notification-media';

export class NotifyUsersOfReleaseNoteCommand implements ReleaseNoteNotificationContent {
  readonly releaseNoteId: UUID;
  readonly headline: string;
  readonly body: string;
  readonly media: NotificationMedia | null;

  constructor(params: ReleaseNoteNotificationContent) {
    this.releaseNoteId = params.releaseNoteId;
    this.headline = params.headline;
    this.body = params.body;
    this.media = params.media;
  }
}
