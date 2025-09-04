import { User } from 'src/iam/users/domain/user.entity';
import { WebhookEvent } from '../webhook-event.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import { cleanUserData } from 'src/common/util/clean-user-data';

export class UserUpdatedWebhookEvent extends WebhookEvent {
  readonly eventType: WebhookEventType = WebhookEventType.USER_UPDATED;
  readonly data: User;
  readonly timestamp: Date;

  constructor(user: User) {
    super();
    this.eventType = WebhookEventType.USER_UPDATED;
    this.data = cleanUserData(user);
    this.timestamp = new Date();
  }
}
