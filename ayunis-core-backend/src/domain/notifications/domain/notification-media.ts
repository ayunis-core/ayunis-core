import { isAllowedImageContentType } from 'src/common/util/content-type.util';
import {
  LOOM_EMBED_URL_PREFIX,
  NOTIFICATION_MEDIA_URL_MAX_LENGTH,
} from './notifications.constants';

export enum NotificationMediaType {
  IMAGE = 'image',
  LOOM = 'loom',
}

/** An image stored in the storage module, served only to the recipient. */
export interface NotificationImage {
  readonly type: NotificationMediaType.IMAGE;
  readonly storageKey: string;
  readonly contentType: string;
}

/** A Loom video, embedded by its `https://www.loom.com/embed/` URL. */
export interface NotificationLoomVideo {
  readonly type: NotificationMediaType.LOOM;
  readonly url: string;
}

export type NotificationMedia = NotificationImage | NotificationLoomVideo;

/**
 * Why a notification may not carry this media, or null when it may. Also
 * applied by writers that store notification media without
 * `CreateNotificationUseCase` (the release-note sync).
 */
export function notificationMediaViolation(
  media: NotificationMedia,
): string | null {
  if (media.type === NotificationMediaType.LOOM) {
    if (!media.url.startsWith(LOOM_EMBED_URL_PREFIX)) {
      return `a Loom video needs a URL starting with ${LOOM_EMBED_URL_PREFIX}`;
    }
    if (media.url.length > NOTIFICATION_MEDIA_URL_MAX_LENGTH) {
      return `the Loom URL is longer than ${NOTIFICATION_MEDIA_URL_MAX_LENGTH} characters`;
    }
    return null;
  }
  if (media.storageKey.trim().length === 0) {
    return 'an image needs a storage key';
  }
  if (!isAllowedImageContentType(media.contentType)) {
    return `images of type ${media.contentType} are not supported`;
  }
  return null;
}
