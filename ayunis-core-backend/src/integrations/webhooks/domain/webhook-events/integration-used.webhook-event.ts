import type { IntegrationUsedPayload as IntegrationUsedWebhookPayload } from '@ayunis-core/connect-sdk/contracts';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

export type { IntegrationUsedPayload as IntegrationUsedWebhookPayload } from '@ayunis-core/connect-sdk/contracts';

export class IntegrationUsedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.INTEGRATION_USED
> {
  readonly eventType = WebhookEventType.INTEGRATION_USED;
  readonly timestamp = new Date();

  constructor(readonly data: IntegrationUsedWebhookPayload) {
    super();
  }
}
