import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import type { UUID } from 'crypto';
import { WebhookEvent } from '../webhook-event.entity';

export class UserDeletedWebhookEvent extends WebhookEvent {
  readonly eventType: WebhookEventType = WebhookEventType.USER_DELETED;
  readonly data: { id: UUID; email: string; orgId: UUID };
  readonly timestamp: Date;

  constructor(params: { id: UUID; email: string; orgId: UUID }) {
    super();
    this.eventType = WebhookEventType.USER_DELETED;
    this.data = { id: params.id, email: params.email, orgId: params.orgId };
    this.timestamp = new Date();
  }
}
