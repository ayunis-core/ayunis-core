import type { ChatSentPayload as ChatSentWebhookPayload } from '@ayunis-core/connect-sdk/contracts';
import type { UUID } from 'crypto';
import type { User } from 'src/iam/users/domain/user.entity';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

export type { ChatSentPayload as ChatSentWebhookPayload } from '@ayunis-core/connect-sdk/contracts';

/**
 * Emitted once per user-sent chat message. Carries the sender's email and
 * name so downstream consumers can lazily create the user in external
 * systems without a callback into Ayunis Core.
 */
export class ChatSentWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.CHAT_SENT
> {
  readonly eventType = WebhookEventType.CHAT_SENT;
  readonly data: ChatSentWebhookPayload;
  readonly timestamp: Date;

  constructor(
    message: { userId: UUID; orgId: UUID; threadId: UUID; messageId: UUID },
    user: User,
  ) {
    super();
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
