import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { NotificationMedia } from 'src/domain/notifications/domain/notification-media';

/**
 * Ayunis' copy of a release note written in Announcable, shown to every user
 * as a product update. It owns its stored image.
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
  /**
   * False for a note that was already old news when it was first synced,
   * which is unread for nobody.
   */
  readonly announced: boolean;
  /** When the note was first synced; decides for whom it is unread. */
  readonly createdAt: Date;
  /** Announcable's date of the note, as `YYYY-MM-DD`. */
  readonly publishedOn: string | null;

  constructor(params: {
    id?: UUID;
    announcableId: string;
    headline: string;
    body: string;
    media?: NotificationMedia | null;
    imageSourcePath?: string | null;
    lastUpdateOn: string;
    announced?: boolean;
    createdAt?: Date;
    publishedOn?: string | null;
  }) {
    this.id = params.id ?? randomUUID();
    this.announcableId = params.announcableId;
    this.headline = params.headline;
    this.body = params.body;
    this.media = params.media ?? null;
    this.imageSourcePath = params.imageSourcePath ?? null;
    this.lastUpdateOn = params.lastUpdateOn;
    this.announced = params.announced ?? false;
    this.createdAt = params.createdAt ?? new Date();
    this.publishedOn = params.publishedOn ?? null;
  }

  /** The day shown for the note, as `YYYY-MM-DD`. */
  get date(): string {
    return this.publishedOn ?? this.createdAt.toISOString().slice(0, 10);
  }
}
