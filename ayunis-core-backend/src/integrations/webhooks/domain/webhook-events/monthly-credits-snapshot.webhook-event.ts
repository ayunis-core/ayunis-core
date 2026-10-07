import type { UUID } from 'crypto';
import type { MonthlyCreditsSnapshotEvent } from 'src/domain/usage/application/events/monthly-credits-snapshot.event';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

export interface MonthlyCreditsSnapshotWebhookPayload {
  organizationId: UUID;
  periodStart: string;
  periodEnd: string;
  creditsConsumed: number;
}

export class MonthlyCreditsSnapshotWebhookEvent extends WebhookEvent<MonthlyCreditsSnapshotWebhookPayload> {
  readonly eventType = WebhookEventType.USAGE_MONTHLY_CREDITS_SNAPSHOT;
  readonly data: MonthlyCreditsSnapshotWebhookPayload;
  readonly timestamp = new Date();

  constructor(event: MonthlyCreditsSnapshotEvent) {
    super();
    this.data = {
      organizationId: event.organizationId,
      periodStart: event.periodStart.toISOString(),
      periodEnd: event.periodEnd.toISOString(),
      creditsConsumed: event.creditsConsumed,
    };
  }
}
