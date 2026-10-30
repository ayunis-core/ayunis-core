import type { UserInvitedPayload as UserInvitedWebhookPayload } from '@ayunis-core/connect-sdk/contracts';
import type { Invite } from 'src/iam/invites/domain/invite.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export type { UserInvitedPayload as UserInvitedWebhookPayload } from '@ayunis-core/connect-sdk/contracts';

export class UserInvitedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.USER_INVITED
> {
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
