import { deserialize } from 'node:v8';
import { randomUUID, type UUID } from 'crypto';
import fixtures from 'src/integrations/webhooks/testing/persisted-billing-events.json';
import { DeliverBillingWebhookUseCase } from './deliver-billing-webhook.use-case';

function entry() {
  const fixture = fixtures[0];
  return {
    id: randomUUID(),
    orgId: fixture.orgId as UUID,
    createdAt: new Date(),
    pending: {
      name: fixture.name,
      event: deserialize(Buffer.from(fixture.payload, 'base64')) as unknown,
    },
  };
}
it.each(fixtures)(
  'delivers the pre-cleanup persisted $name event',
  async (fixture) => {
    const handler = { sendWebhook: jest.fn().mockResolvedValue(undefined) };
    const useCase = new DeliverBillingWebhookUseCase(handler);
    const command = {
      ...entry(),
      orgId: fixture.orgId as UUID,
      pending: {
        name: fixture.name,
        event: deserialize(Buffer.from(fixture.payload, 'base64')) as unknown,
      },
    };
    await useCase.execute(command);
    expect(handler.sendWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        id: command.id,
        timestamp: command.createdAt,
        eventType: fixture.expected,
      }),
    );
  },
);
it.each([
  'unknown-name',
  'missing-id',
  'wrong-allowance',
  'invalid-date',
  'wrong-org',
  'invalid-id',
  'wrong-event-payload',
  'wrong-payload-org',
  'missing-event',
])('rejects %s without attempting HTTP delivery', async (failure) => {
  const handler = { sendWebhook: jest.fn() };
  const command = entry();
  const event = command.pending.event as {
    orgId: UUID;
    payload: Record<string, unknown>;
  };
  if (failure === 'invalid-id') event.payload.id = 'not-a-uuid';
  if (failure === 'wrong-event-payload')
    command.pending.name = 'subscription.seats-updated';
  if (failure === 'wrong-payload-org') event.payload.orgId = randomUUID();
  if (failure === 'missing-event') command.pending.event = undefined;
  if (failure === 'unknown-name')
    command.pending.name = 'subscription.unsupported';
  if (failure === 'missing-id') delete event.payload.id;
  if (failure === 'wrong-allowance') event.payload.monthlyCredits = 'unlimited';
  if (failure === 'invalid-date') event.payload.startsAt = new Date(NaN);
  if (failure === 'wrong-org') command.orgId = randomUUID();
  await expect(
    new DeliverBillingWebhookUseCase(handler).execute(command),
  ).rejects.toMatchObject({ code: 'INVALID_PERSISTED_BILLING_EVENT' });
  expect(handler.sendWebhook).not.toHaveBeenCalled();
});
