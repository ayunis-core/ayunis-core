import type { AcademyProgressUpdatedPayload as AcademyProgressUpdatedWebhookPayload } from '@ayunis-core/connect-sdk/contracts';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

export type { AcademyProgressUpdatedPayload as AcademyProgressUpdatedWebhookPayload } from '@ayunis-core/connect-sdk/contracts';

export class AcademyProgressUpdatedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.ACADEMY_PROGRESS_UPDATED
> {
  readonly eventType = WebhookEventType.ACADEMY_PROGRESS_UPDATED;
  readonly timestamp = new Date();

  constructor(readonly data: AcademyProgressUpdatedWebhookPayload) {
    super();
  }
}
