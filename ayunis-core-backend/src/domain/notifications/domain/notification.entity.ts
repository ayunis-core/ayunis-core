import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
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
  readonly subheadline: string;
  /** Markdown; may contain links. */
  readonly body: string;
  readonly routineId: UUID | null;
  readonly routineThreadId: UUID | null;
  readonly readAt: Date | null;
  readonly createdAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    orgId: UUID;
    type: NotificationType;
    headline: string;
    subheadline: string;
    body: string;
    routineId?: UUID | null;
    routineThreadId?: UUID | null;
    readAt?: Date | null;
    createdAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.type = params.type;
    this.headline = params.headline;
    this.subheadline = params.subheadline;
    this.body = params.body;
    this.routineId = params.routineId ?? null;
    this.routineThreadId = params.routineThreadId ?? null;
    this.readAt = params.readAt ?? null;
    this.createdAt = params.createdAt ?? new Date();
  }
}
