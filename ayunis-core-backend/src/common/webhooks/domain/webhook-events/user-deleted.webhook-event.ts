import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import { UUID } from 'crypto';
import { WebhookEvent } from '../webhook-event.entity';

export class UserDeletedWebhookEvent extends WebhookEvent {
  readonly eventType: WebhookEventType = WebhookEventType.USER_DELETED;
  readonly data: UUID;
  readonly timestamp: Date;

  constructor(userId: UUID) {
    super();
    this.eventType = WebhookEventType.USER_DELETED;
    this.data = userId;
    this.timestamp = new Date();
  }
}
