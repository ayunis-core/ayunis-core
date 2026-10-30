import type { IntegrationInstalledPayload as IntegrationInstalledWebhookPayload } from '@ayunis-core/connect-sdk/contracts';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

export type { IntegrationInstalledPayload as IntegrationInstalledWebhookPayload } from '@ayunis-core/connect-sdk/contracts';

export class IntegrationInstalledWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.INTEGRATION_INSTALLED
> {
  readonly eventType = WebhookEventType.INTEGRATION_INSTALLED;
  readonly timestamp = new Date();

  constructor(readonly data: IntegrationInstalledWebhookPayload) {
    super();
  }
}
