import { WebhookEvent } from '../webhook-event.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import type { AddonWebhookPayload } from './addon-activated.webhook-event';

export class AddonDeactivatedWebhookEvent extends WebhookEvent<AddonWebhookPayload> {
  readonly eventType: WebhookEventType;
  readonly data: AddonWebhookPayload;
  readonly timestamp: Date;

  constructor(payload: AddonWebhookPayload) {
    super();
    this.eventType = WebhookEventType.ADDON_DEACTIVATED;
    this.data = payload;
    this.timestamp = new Date();
  }
}
