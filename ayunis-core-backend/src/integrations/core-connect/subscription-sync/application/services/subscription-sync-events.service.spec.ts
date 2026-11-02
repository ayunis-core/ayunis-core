import { Logger } from '@nestjs/common';
import { DeliverBillingWebhookUseCase } from 'src/integrations/webhooks/application/use-cases/deliver-billing-webhook/deliver-billing-webhook.use-case';
import type {
  SubscriptionSyncOutbox,
  SubscriptionSyncOutboxEntry,
} from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-outbox';
import { AddonActivatedEvent } from 'src/iam/addons/application/events/addon-activated.event';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { SubscriptionSyncEventsService } from './subscription-sync-events.service';

describe('durable External subscription events', () => {
  it('retries committed work after listener recovery without requiring another state change', async () => {
    const emitter = new EventEmitter2();
    const orgId = randomUUID();
    const pending = {
      name: AddonActivatedEvent.EVENT_NAME,
      event: new AddonActivatedEvent(
        orgId,
        AddonType.AYUNIS_CORE_ACADEMY,
        null,
      ),
    } as const;
    const events: SubscriptionSyncOutboxEntry[] = [
      {
        id: randomUUID(),
        orgId,
        claimToken: randomUUID(),
        createdAt: new Date(),
        pending,
      },
    ];
    const completed: string[] = [];
    const outbox = {
      append: jest.fn(),
      claim: async () =>
        events.find((event) => !completed.includes(event.id)) ?? null,
      complete: async (id: string) => {
        completed.push(id);
      },
      retry: jest.fn(),
    } as unknown as SubscriptionSyncOutbox;
    let available = false;
    const received: unknown[] = [];
    let localEffects = 0;
    emitter.on(AddonActivatedEvent.EVENT_NAME, () => {
      localEffects++;
    });
    const service = new SubscriptionSyncEventsService(emitter, outbox, {
      execute: async (entry: { pending: { event: unknown } }) => {
        if (!available) throw new Error('receiver unavailable');
        received.push(entry.pending.event);
      },
    } as unknown as DeliverBillingWebhookUseCase);
    await service.publish(events[0].orgId, [pending]);
    await service.flush();
    expect(localEffects).toBe(1);
    expect(completed).toEqual([]);
    available = true;
    await service.flush();
    expect(completed).toHaveLength(1);
    expect(localEffects).toBe(1);
    expect(received).toEqual([events[0].pending.event]);
  });
});

it('identifies a blocked delivery without logging its payload', async () => {
  const entry: SubscriptionSyncOutboxEntry = {
    id: randomUUID(),
    orgId: randomUUID(),
    claimToken: randomUUID(),
    createdAt: new Date(0),
    pending: {
      name: 'subscription.unsupported',
      event: { privateBillingValue: 'sensitive-marker' },
    },
  };
  const outbox = {
    claim: jest.fn().mockResolvedValueOnce(entry),
    retry: jest.fn(),
    complete: jest.fn(),
  };
  const log = jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => undefined);
  try {
    const service = new SubscriptionSyncEventsService(
      new EventEmitter2(),
      outbox as unknown as SubscriptionSyncOutbox,
      new DeliverBillingWebhookUseCase({ sendWebhook: jest.fn() }),
    );
    await service.flush();
    expect(outbox.retry).toHaveBeenCalledWith(entry.id, entry.claimToken);
    expect(outbox.complete).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: entry.id,
        orgId: entry.orgId,
        failureCode: 'INVALID_PERSISTED_BILLING_EVENT',
        eventAgeSeconds: expect.any(Number),
      }),
      expect.any(String),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('sensitive-marker');
  } finally {
    log.mockRestore();
  }
});
