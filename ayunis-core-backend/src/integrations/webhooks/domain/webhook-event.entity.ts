import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { WebhookEventType } from './value-objects/webhook-event-type.enum';

export abstract class WebhookEvent<TData = unknown> {
  readonly id: UUID = randomUUID();
  readonly eventType: WebhookEventType;
  readonly data: TData;
  readonly timestamp: Date;
}
