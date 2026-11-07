import type { UUID } from 'crypto';
import type { NotificationMedia } from 'src/domain/notifications/domain/notification-media';

/**
 * What the notifications of a release note show. The release-notes module
 * has already applied the notification rules to it.
 */
export interface ReleaseNoteNotificationContent {
  readonly releaseNoteId: UUID;
  readonly headline: string;
  /** Markdown. */
  readonly body: string;
  readonly media: NotificationMedia | null;
}
