import type { UserDeletedPayload } from '@ayunis-core/connect-sdk/contracts';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import type { UUID } from 'crypto';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export class UserDeletedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.USER_DELETED
> {
  readonly eventType = WebhookEventType.USER_DELETED;
  readonly data: UserDeletedPayload;
  readonly timestamp: Date;

  constructor(params: { id: UUID; email: string; orgId: UUID }) {
    super();
    this.data = { id: params.id, email: params.email, orgId: params.orgId };
    this.timestamp = new Date();
  }
}
