import type { DeliverBillingWebhookUseCase } from 'src/integrations/webhooks/application/use-cases/deliver-billing-webhook/deliver-billing-webhook.use-case';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { ExternalSubscriptionEventsService } from './external-subscription-events.service';
import type { ExternalSubscriptionOutbox } from 'src/integrations/external-subscriptions/application/ports/external-subscription-outbox';

describe('durable External subscription events', () => {
  it('retries committed work after listener recovery without requiring another state change', async () => {
    const emitter = new EventEmitter2();
    const events = [
      {
        id: randomUUID(),
        orgId: randomUUID(),
        pending: {
          name: 'subscription.created',
          event: { startsAt: new Date('2026-10-20Z') },
        },
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
    } as unknown as ExternalSubscriptionOutbox;
    let available = false;
    const received: unknown[] = [];
    let localEffects = 0;
    emitter.on('subscription.created', () => {
      localEffects++;
    });
    const service = new ExternalSubscriptionEventsService(emitter, outbox, {
      execute: async (entry: { pending: { event: unknown } }) => {
        if (!available) throw new Error('receiver unavailable');
        received.push(entry.pending.event);
      },
    } as unknown as DeliverBillingWebhookUseCase);
    await service.publish(events[0].orgId, [events[0].pending]);
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
