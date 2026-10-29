import type { SkillInstalledPayload as SkillInstalledWebhookPayload } from '@ayunis-core/connect-sdk/contracts';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

export type { SkillInstalledPayload as SkillInstalledWebhookPayload } from '@ayunis-core/connect-sdk/contracts';

export class SkillInstalledWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.SKILL_INSTALLED
> {
  readonly eventType = WebhookEventType.SKILL_INSTALLED;
  readonly timestamp = new Date();

  constructor(readonly data: SkillInstalledWebhookPayload) {
    super();
  }
}
