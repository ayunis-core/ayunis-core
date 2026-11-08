import type { UUID } from 'crypto';
import type { NotificationMedia } from 'src/domain/notifications/domain/notification-media';
import type { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';

/**
 * The recipient is part of the command: notifications are posted by the
 * system (routine runs, the routine sweep), not by the recipient.
 */
export class CreateNotificationCommand {
  readonly userId: UUID;
  readonly orgId: UUID;
  readonly type: NotificationType;
  readonly headline: string;
  readonly subheadline: string | null;
  readonly body: string;
  readonly media: NotificationMedia | null;
  readonly routineId: UUID | null;
  readonly routineThreadId: UUID | null;
  /** At most this many notifications per routine thread (one routine run). */
  readonly limitPerRoutineThread?: number;

  constructor(params: {
    userId: UUID;
    orgId: UUID;
    type: NotificationType;
    headline: string;
    subheadline?: string | null;
    body: string;
    media?: NotificationMedia | null;
    routineId?: UUID | null;
    routineThreadId?: UUID | null;
    limitPerRoutineThread?: number;
  }) {
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.type = params.type;
    this.headline = params.headline;
    this.subheadline = params.subheadline ?? null;
    this.body = params.body;
    this.media = params.media ?? null;
    this.routineId = params.routineId ?? null;
    this.routineThreadId = params.routineThreadId ?? null;
    this.limitPerRoutineThread = params.limitPerRoutineThread;
  }
}
