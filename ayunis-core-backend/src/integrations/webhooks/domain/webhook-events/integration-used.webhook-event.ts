import type { UUID } from 'crypto';
import { WebhookEvent } from '../webhook-event.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';

export interface IntegrationUsedWebhookPayload {
  userId: UUID;
  orgId: UUID;
  integrationId: UUID;
  integrationName: string;
  userEmail: string;
  userName: string;
}

export class IntegrationUsedWebhookEvent extends WebhookEvent<IntegrationUsedWebhookPayload> {
  readonly eventType = WebhookEventType.INTEGRATION_USED;
  readonly timestamp = new Date();

  constructor(readonly data: IntegrationUsedWebhookPayload) {
    super();
  }
}
