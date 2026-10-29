import type { OnboardingUpdatedPayload as OnboardingUpdatedWebhookPayload } from '@ayunis-core/connect-sdk/contracts';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

export type { OnboardingUpdatedPayload as OnboardingUpdatedWebhookPayload } from '@ayunis-core/connect-sdk/contracts';

export class OnboardingUpdatedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.ONBOARDING_UPDATED
> {
  readonly eventType = WebhookEventType.ONBOARDING_UPDATED;
  readonly timestamp = new Date();

  constructor(readonly data: OnboardingUpdatedWebhookPayload) {
    super();
  }
}
