import type { AddonPayload as AddonWebhookPayload } from '@ayunis-core/connect-sdk/contracts';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

export type { AddonPayload as AddonWebhookPayload } from '@ayunis-core/connect-sdk/contracts';

export class AddonActivatedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.ADDON_ACTIVATED
> {
  readonly eventType = WebhookEventType.ADDON_ACTIVATED;
  readonly data: AddonWebhookPayload;
  readonly timestamp: Date;

  constructor(payload: AddonWebhookPayload) {
    super();
    this.data = payload;
    this.timestamp = new Date();
  }
}
