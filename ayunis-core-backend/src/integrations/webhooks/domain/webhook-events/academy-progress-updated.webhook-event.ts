import type { UUID } from 'crypto';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

export interface AcademyProgressUpdatedWebhookPayload {
  userId: UUID;
  orgId: UUID;
  userEmail: string;
  userName: string;
  started: boolean;
  participationConfirmedAt: string | null;
}

export class AcademyProgressUpdatedWebhookEvent extends WebhookEvent<AcademyProgressUpdatedWebhookPayload> {
  readonly eventType = WebhookEventType.ACADEMY_PROGRESS_UPDATED;
  readonly timestamp = new Date();

  constructor(readonly data: AcademyProgressUpdatedWebhookPayload) {
    super();
  }
}
