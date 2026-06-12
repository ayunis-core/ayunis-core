import type { UUID } from 'crypto';
import { WebhookEvent } from '../webhook-event.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import type { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';

export interface AddonWebhookPayload {
  orgId: UUID;
  addonType: AddonType;
  actorUserId: UUID;
}

export class AddonActivatedWebhookEvent extends WebhookEvent<AddonWebhookPayload> {
  readonly eventType: WebhookEventType;
  readonly data: AddonWebhookPayload;
  readonly timestamp: Date;

  constructor(payload: AddonWebhookPayload) {
    super();
    this.eventType = WebhookEventType.ADDON_ACTIVATED;
    this.data = payload;
    this.timestamp = new Date();
  }
}
