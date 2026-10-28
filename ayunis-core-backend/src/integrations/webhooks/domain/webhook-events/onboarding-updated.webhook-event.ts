import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

export interface OnboardingUpdatedWebhookPayload {
  userId: UUID;
  orgId: UUID;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  previousCompletedStepIds: string[];
  completedStepIds: string[];
  previousHidden: boolean;
  hidden: boolean;
}

export class OnboardingUpdatedWebhookEvent extends WebhookEvent<OnboardingUpdatedWebhookPayload> {
  readonly eventType = WebhookEventType.ONBOARDING_UPDATED;
  readonly timestamp = new Date();

  constructor(readonly data: OnboardingUpdatedWebhookPayload) {
    super();
  }
}
