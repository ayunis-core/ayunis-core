import type { UUID } from 'crypto';
import type { Invite } from 'src/iam/invites/domain/invite.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export interface UserInvitedWebhookPayload {
  id: UUID;
  email: string;
  orgId: UUID;
  name: string;
}

export class UserInvitedWebhookEvent extends WebhookEvent {
  readonly eventType = WebhookEventType.USER_INVITED;
  readonly data: UserInvitedWebhookPayload;
  readonly timestamp = new Date();

  constructor(invite: Invite) {
    super();
    this.data = {
      id: invite.id,
      email: invite.email,
      orgId: invite.orgId,
      name: invite.email,
    };
  }
}
