import type { SkillUsedPayload as SkillUsedWebhookPayload } from '@ayunis-core/connect-sdk/contracts';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

export type { SkillUsedPayload as SkillUsedWebhookPayload } from '@ayunis-core/connect-sdk/contracts';

export class SkillUsedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.SKILL_USED
> {
  readonly eventType = WebhookEventType.SKILL_USED;
  readonly timestamp = new Date();

  constructor(readonly data: SkillUsedWebhookPayload) {
    super();
  }
}
