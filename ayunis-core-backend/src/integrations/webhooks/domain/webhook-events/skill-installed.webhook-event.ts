import type { UUID } from 'crypto';
import { WebhookEvent } from '../webhook-event.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';

export interface SkillInstalledWebhookPayload {
  userId: UUID;
  orgId: UUID;
  identifier: string;
  userEmail: string;
  userName: string;
}

export class SkillInstalledWebhookEvent extends WebhookEvent<SkillInstalledWebhookPayload> {
  readonly eventType = WebhookEventType.SKILL_INSTALLED;
  readonly timestamp = new Date();

  constructor(readonly data: SkillInstalledWebhookPayload) {
    super();
  }
}
