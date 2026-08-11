import type { UUID } from 'crypto';
import { WebhookEvent } from '../webhook-event.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';

export interface IntegrationInstalledWebhookPayload {
  userId: UUID;
  orgId: UUID;
  identifier: string;
  userEmail: string;
  userName: string;
}

export class IntegrationInstalledWebhookEvent extends WebhookEvent<IntegrationInstalledWebhookPayload> {
  readonly eventType = WebhookEventType.INTEGRATION_INSTALLED;
  readonly timestamp = new Date();

  constructor(readonly data: IntegrationInstalledWebhookPayload) {
    super();
  }
}
