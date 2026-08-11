import type { UUID } from 'crypto';
import { WebhookEvent } from '../webhook-event.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';

export interface SkillUsedWebhookPayload {
  userId: UUID;
  orgId: UUID;
  skillId: UUID;
  skillName: string;
  userEmail: string;
  userName: string;
}

export class SkillUsedWebhookEvent extends WebhookEvent<SkillUsedWebhookPayload> {
  readonly eventType = WebhookEventType.SKILL_USED;
  readonly timestamp = new Date();

  constructor(readonly data: SkillUsedWebhookPayload) {
    super();
  }
}
