import { DeliverBillingWebhookUseCase } from 'src/integrations/webhooks/application/use-cases/deliver-billing-webhook/deliver-billing-webhook.use-case';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import type { PendingBillingEvent } from 'src/integrations/webhooks/application/events/pending-billing-event';
import { runWithDeferredWebhookDelivery } from 'src/integrations/webhooks/application/context/webhook-delivery-context';
import { InvalidPersistedBillingEventError } from 'src/integrations/webhooks/application/errors/webhook.errors';
import { SubscriptionSyncOutbox } from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-outbox';

@Injectable()
export class SubscriptionSyncEventsService {
  private readonly logger = new Logger(SubscriptionSyncEventsService.name);
  constructor(
    private readonly emitter: EventEmitter2,
    private readonly outbox: SubscriptionSyncOutbox,
    private readonly deliver: DeliverBillingWebhookUseCase,
  ) {}

  async publish(orgId: UUID, events: PendingBillingEvent[]): Promise<void> {
    await this.outbox.append(orgId, events);
    await runWithDeferredWebhookDelivery(
      events.map(({ event }) => event),
      async () => {
        // Finish each local listener before a failure can roll back its transaction.
        for (const pending of events) {
          for (const listener of this.emitter.listeners(pending.name))
            await Promise.resolve(listener(pending.event));
        }
      },
    );
  }

  async flush(): Promise<void> {
    for (let count = 0; count < 25; count++) {
      const entry = await this.outbox.claim();
      if (!entry) return;
      try {
        await this.deliver.execute(entry);
        await this.outbox.complete(entry.id, entry.claimToken);
      } catch (error) {
        this.logger.error(
          {
            err: error,
            orgId: entry.orgId,
            eventId: entry.id,
            eventAgeSeconds: Math.max(
              0,
              Math.floor((Date.now() - entry.createdAt.getTime()) / 1000),
            ),
            failureCode:
              error instanceof InvalidPersistedBillingEventError
                ? 'INVALID_PERSISTED_BILLING_EVENT'
                : 'WEBHOOK_DELIVERY_FAILED',
          },
          'External subscription event delivery failed; persisted for retry',
        );
        await this.outbox.retry(entry.id, entry.claimToken);
        return;
      }
    }
  }
}
