import type { UUID } from 'crypto';
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
  readonly subheadline: string;
  readonly body: string;
  readonly routineId: UUID | null;
  readonly routineThreadId: UUID | null;
  /** At most this many notifications per routine thread (one routine run). */
  readonly limitPerRoutineThread?: number;

  constructor(params: {
    userId: UUID;
    orgId: UUID;
    type: NotificationType;
    headline: string;
    subheadline: string;
    body: string;
    routineId?: UUID | null;
    routineThreadId?: UUID | null;
    limitPerRoutineThread?: number;
  }) {
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.type = params.type;
    this.headline = params.headline;
    this.subheadline = params.subheadline;
    this.body = params.body;
    this.routineId = params.routineId ?? null;
    this.routineThreadId = params.routineThreadId ?? null;
    this.limitPerRoutineThread = params.limitPerRoutineThread;
  }
}
