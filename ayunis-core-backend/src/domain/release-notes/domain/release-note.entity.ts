import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { NotificationMedia } from 'src/domain/notifications/domain/notification-media';

/**
 * Ayunis' copy of a release note written in Announcable. It owns its stored
 * image; notifications of the note only reference it.
 */
export class ReleaseNote {
  readonly id: UUID;
  /** Announcable's `id`; one stored note per Announcable note. */
  readonly announcableId: string;
  readonly headline: string;
  /** Markdown; ends with the note's link when it has one. */
  readonly body: string;
  readonly media: NotificationMedia | null;
  /**
   * Announcable's image URL without its expiring signature, so the image is
   * only downloaded again when it changes.
   */
  readonly imageSourcePath: string | null;
  /** Announcable's `last_update_on`, compared verbatim to detect edits. */
  readonly lastUpdateOn: string;

  constructor(params: {
    id?: UUID;
    announcableId: string;
    headline: string;
    body: string;
    media?: NotificationMedia | null;
    imageSourcePath?: string | null;
    lastUpdateOn: string;
  }) {
    this.id = params.id ?? randomUUID();
    this.announcableId = params.announcableId;
    this.headline = params.headline;
    this.body = params.body;
    this.media = params.media ?? null;
    this.imageSourcePath = params.imageSourcePath ?? null;
    this.lastUpdateOn = params.lastUpdateOn;
  }
}
