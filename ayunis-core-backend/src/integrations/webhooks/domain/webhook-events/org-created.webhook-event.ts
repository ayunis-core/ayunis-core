import { WebhookEvent } from '../webhook-event.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import type { Org } from 'src/iam/orgs/domain/org.entity';

export class OrgCreatedWebhookEvent extends WebhookEvent<Org> {
  readonly eventType: WebhookEventType;
  readonly data: Org;
  readonly timestamp: Date;

  constructor(org: Org) {
    super();
    this.eventType = WebhookEventType.ORG_CREATED;
    this.data = org;
    this.timestamp = new Date();
  }
}
