import type { UUID } from 'crypto';
import type { User } from 'src/iam/users/domain/user.entity';
import { WebhookEvent } from '../webhook-event.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';

export interface ChatSentWebhookPayload {
  userId: UUID;
  orgId: UUID;
  threadId: UUID;
  messageId: UUID;
  userEmail: string;
  userName: string;
}

/**
 * Emitted once per user-sent chat message. Carries the sender's email and
 * name so downstream consumers can lazily create the user in external
 * systems without a callback into Ayunis Core.
 */
export class ChatSentWebhookEvent extends WebhookEvent<ChatSentWebhookPayload> {
  readonly eventType: WebhookEventType;
  readonly data: ChatSentWebhookPayload;
  readonly timestamp: Date;

  constructor(
    message: { userId: UUID; orgId: UUID; threadId: UUID; messageId: UUID },
    user: User,
  ) {
    super();
    this.eventType = WebhookEventType.CHAT_SENT;
    this.data = {
      userId: message.userId,
      orgId: message.orgId,
      threadId: message.threadId,
      messageId: message.messageId,
      userEmail: user.email,
      userName: user.name,
    };
    this.timestamp = new Date();
  }
}
