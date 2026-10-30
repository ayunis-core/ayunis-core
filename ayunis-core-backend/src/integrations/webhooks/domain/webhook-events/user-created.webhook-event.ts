import type { EventPayload } from '@ayunis-core/connect-sdk/contracts';
import { mapUserToWebhookPayload } from 'src/integrations/webhooks/domain/mappers/user-webhook-payload.mapper';
import type { UUID } from 'crypto';
import type { User } from 'src/iam/users/domain/user.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export class UserCreatedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.USER_CREATED
> {
  readonly eventType = WebhookEventType.USER_CREATED;
  readonly data: EventPayload<typeof WebhookEventType.USER_CREATED>;
  readonly timestamp: Date;

  // `orgName` is a best-effort enrichment resolved by the dispatch
  // listener (AYC-445, consumed by the Brevo onboarding sink for email
  // personalization). Optional: a failed org lookup sends the event
  // without it rather than dropping the webhook, and JSON.stringify
  // omits the key entirely when undefined.
  constructor(params: { user: User; orgId: UUID; orgName?: string }) {
    const { user, orgId, orgName } = params;
    super();
    this.data = { ...mapUserToWebhookPayload(user), orgId, orgName };
    this.timestamp = new Date();
  }
}
