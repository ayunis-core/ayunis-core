import { WebhookEvent } from '../webhook-event.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import { Org } from 'src/iam/orgs/domain/org.entity';

export class OrgCreatedWebhookEvent extends WebhookEvent {
  readonly eventType: WebhookEventType;
  readonly data: Org;
  readonly timestamp: Date;

  constructor(org: Org) {
    super();
    this.eventType = WebhookEventType.ORG_CREATED;
    this.data = org;
    this.timestamp = new Date(); // Is only created
  }
}
