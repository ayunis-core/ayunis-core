import { DeliverBillingWebhookUseCase } from 'src/integrations/webhooks/application/use-cases/deliver-billing-webhook/deliver-billing-webhook.use-case';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import type { PendingDomainEvent } from 'src/common/events/pending-domain-event';
import { localBillingEventContext } from 'src/common/events/durable-event-context';
import { FynnOutbox } from 'src/integrations/fynn/application/ports/fynn-outbox';

@Injectable()
export class FynnSyncEventsService {
  private readonly logger = new Logger(FynnSyncEventsService.name);
  constructor(
    private readonly emitter: EventEmitter2,
    private readonly outbox: FynnOutbox,
    private readonly deliver: DeliverBillingWebhookUseCase,
  ) {}

  async publish(orgId: UUID, events: PendingDomainEvent[]): Promise<void> {
    await this.outbox.append(orgId, events);
    await localBillingEventContext.run(true, async () => {
      for (const pending of events)
        await this.emitter.emitAsync(pending.name, pending.event);
    });
  }

  async flush(): Promise<void> {
    for (let count = 0; count < 25; count++) {
      const entry = await this.outbox.claim();
      if (!entry) return;
      try {
        await this.deliver.execute(entry);
        await this.outbox.complete(entry.id, entry.claimToken);
      } catch (error) {
        await this.outbox.retry(entry.id, entry.claimToken);
        this.logger.error(
          { err: error, orgId: entry.orgId, eventId: entry.id },
          'Fynn event delivery failed; persisted for retry',
        );
        return;
      }
    }
  }
}
