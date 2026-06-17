import type { UUID } from 'crypto';
import type { User } from 'src/iam/users/domain/user.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import { WebhookEvent } from '../webhook-event.entity';
import { cleanUserData } from 'src/common/util/clean-user-data';

export class UserCreatedWebhookEvent extends WebhookEvent {
  readonly eventType: WebhookEventType;
  readonly data: User & { orgId: UUID };
  readonly timestamp: Date;

  constructor(params: { user: User; orgId: UUID }) {
    const { user, orgId } = params;
    super();
    this.eventType = WebhookEventType.USER_CREATED;
    this.data = { ...cleanUserData(user), orgId };
    this.timestamp = new Date();
  }
}
