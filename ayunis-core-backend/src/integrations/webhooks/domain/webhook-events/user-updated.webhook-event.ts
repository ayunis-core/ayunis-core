import {
  cleanUserData,
  type CleanUserData,
} from 'src/common/util/clean-user-data';
import type { User } from 'src/iam/users/domain/user.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export class UserUpdatedWebhookEvent extends WebhookEvent {
  readonly eventType: WebhookEventType = WebhookEventType.USER_UPDATED;
  readonly data: CleanUserData;
  readonly timestamp: Date;

  constructor(user: User) {
    super();
    this.eventType = WebhookEventType.USER_UPDATED;
    this.data = cleanUserData(user);
    this.timestamp = new Date();
  }
}
