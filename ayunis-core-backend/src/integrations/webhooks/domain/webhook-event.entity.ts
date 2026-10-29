import type { EventPayload } from '@ayunis-core/connect-sdk/contracts';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

export abstract class WebhookEvent<TType extends WebhookEventType> {
  readonly id: UUID = randomUUID();
  readonly eventType: TType;
  readonly data: EventPayload<TType>;
  readonly timestamp: Date;
}

export type AnyWebhookEvent = {
  [T in WebhookEventType]: WebhookEvent<T>;
}[WebhookEventType];
