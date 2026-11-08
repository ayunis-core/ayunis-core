import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { NotificationMedia } from './notification-media';
import type { NotificationType } from './notification-type.enum';

/**
 * A message in a user's inbox. The origin links are dropped, not the
 * notification, when the routine or its thread is deleted.
 */
export class Notification {
  readonly id: UUID;
  /** The recipient; only they can read the notification. */
  readonly userId: UUID;
  readonly orgId: UUID;
  readonly type: NotificationType;
  readonly headline: string;
  readonly subheadline: string | null;
  /** Markdown; may contain links. */
  readonly body: string;
  readonly media: NotificationMedia | null;
  readonly routineId: UUID | null;
  readonly routineThreadId: UUID | null;
  /** The release note it announces; its notifications follow its edits. */
  readonly releaseNoteId: UUID | null;
  readonly readAt: Date | null;
  readonly createdAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    orgId: UUID;
    type: NotificationType;
    headline: string;
    subheadline?: string | null;
    body: string;
    media?: NotificationMedia | null;
    routineId?: UUID | null;
    routineThreadId?: UUID | null;
    releaseNoteId?: UUID | null;
    readAt?: Date | null;
    createdAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.type = params.type;
    this.headline = params.headline;
    this.subheadline = params.subheadline ?? null;
    this.body = params.body;
    this.media = params.media ?? null;
    this.routineId = params.routineId ?? null;
    this.routineThreadId = params.routineThreadId ?? null;
    this.releaseNoteId = params.releaseNoteId ?? null;
    this.readAt = params.readAt ?? null;
    this.createdAt = params.createdAt ?? new Date();
  }
}
