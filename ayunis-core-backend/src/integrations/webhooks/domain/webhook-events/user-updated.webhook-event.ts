import type { UserPayload } from '@ayunis-core/connect-sdk/contracts';
import { mapUserToWebhookPayload } from 'src/integrations/webhooks/domain/mappers/user-webhook-payload.mapper';
import type { User } from 'src/iam/users/domain/user.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export class UserUpdatedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.USER_UPDATED
> {
  readonly eventType = WebhookEventType.USER_UPDATED;
  readonly data: UserPayload;
  readonly timestamp: Date;

  constructor(user: User) {
    super();
    this.data = mapUserToWebhookPayload(user);
    this.timestamp = new Date();
  }
}
