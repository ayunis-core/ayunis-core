import { WebhookEvent } from '../webhook-event.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import type { Org } from 'src/iam/orgs/domain/org.entity';
import type { User } from 'src/iam/users/domain/user.entity';

export class OrgCreatedWebhookEvent extends WebhookEvent {
  readonly eventType: WebhookEventType;
  readonly data: Org & { userEmail: string; userName: string };
  readonly timestamp: Date;

  constructor(org: Org, user: User) {
    super();
    this.eventType = WebhookEventType.ORG_CREATED;
    this.data = { ...org, userEmail: user.email, userName: user.name };
    this.timestamp = new Date(); // Is only created
  }
}
