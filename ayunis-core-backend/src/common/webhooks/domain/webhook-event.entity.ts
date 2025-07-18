import { randomUUID, UUID } from 'crypto';
import { WebhookEventType } from './value-objects/webhook-event-type.enum';

export abstract class WebhookEvent {
  readonly id: UUID = randomUUID();
  readonly eventType: WebhookEventType;
  readonly data: unknown;
  readonly timestamp: Date;
}
