import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import type { AddonWebhookPayload } from 'src/integrations/webhooks/domain/webhook-events/addon-activated.webhook-event';

export class AddonDeactivatedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.ADDON_DEACTIVATED
> {
  readonly eventType = WebhookEventType.ADDON_DEACTIVATED;
  readonly data: AddonWebhookPayload;
  readonly timestamp: Date;

  constructor(payload: AddonWebhookPayload) {
    super();
    this.data = payload;
    this.timestamp = new Date();
  }
}
