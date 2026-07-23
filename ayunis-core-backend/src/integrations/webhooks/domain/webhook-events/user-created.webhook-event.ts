import type { UUID } from 'crypto';
import type { User } from 'src/iam/users/domain/user.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import { WebhookEvent } from '../webhook-event.entity';
import { cleanUserData } from 'src/common/util/clean-user-data';

export class UserCreatedWebhookEvent extends WebhookEvent {
  readonly eventType: WebhookEventType;
  readonly data: User & { orgId: UUID; orgName?: string };
  readonly timestamp: Date;

  // `orgName` is a best-effort enrichment resolved by the dispatch
  // listener (AYC-445, consumed by the Brevo onboarding sink for email
  // personalization). Optional: a failed org lookup sends the event
  // without it rather than dropping the webhook, and JSON.stringify
  // omits the key entirely when undefined.
  constructor(params: { user: User; orgId: UUID; orgName?: string }) {
    const { user, orgId, orgName } = params;
    super();
    this.eventType = WebhookEventType.USER_CREATED;
    this.data = { ...cleanUserData(user), orgId, orgName };
    this.timestamp = new Date();
  }
}
