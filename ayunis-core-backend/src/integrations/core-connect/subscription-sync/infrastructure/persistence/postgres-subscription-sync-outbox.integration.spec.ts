import { serialize } from 'node:v8';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionSyncEventsService } from 'src/integrations/core-connect/subscription-sync/application/services/subscription-sync-events.service';
import { DeliverBillingWebhookUseCase } from 'src/integrations/webhooks/application/use-cases/deliver-billing-webhook/deliver-billing-webhook.use-case';
import type { PendingBillingEvent } from 'src/integrations/webhooks/application/events/pending-billing-event';
import { SubscriptionCreatedEvent } from 'src/iam/subscriptions/application/events/subscription-created.event';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import 'src/config/env';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { SubscriptionSyncOutboxRecord } from './schema/subscription-sync-outbox.record';
import { PostgresSubscriptionSyncOutbox } from './postgres-subscription-sync-outbox';

function createdEvent(
  orgId = randomUUID(),
  startsAt = new Date(),
): Extract<
  PendingBillingEvent,
  { name: typeof SubscriptionCreatedEvent.EVENT_NAME }
> {
  return {
    name: SubscriptionCreatedEvent.EVENT_NAME,
    event: new SubscriptionCreatedEvent(orgId, {
      id: randomUUID(),
      orgId,
      type: SubscriptionType.USAGE_BASED,
      monthlyCredits: 45_000_000,
      startsAt,
      createdAt: startsAt,
      updatedAt: startsAt,
      cancelledAt: null,
      endsAt: null,
    }),
  };
}

describe('External subscription durable outbox in PostgreSQL', () => {
  let db: DataSource;
  let outbox: PostgresSubscriptionSyncOutbox;
  let tx: TransactionHost<TransactionalAdapterTypeOrm>;
  const schema = `subscription_sync_outbox_${randomUUID().replaceAll('-', '')}`;
  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [SubscriptionSyncOutboxRecord],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const setup = db.createQueryRunner();
    await setup.createSchema(schema, true);
    await setup.release();
    await db.synchronize();
    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    tx = new TransactionHost({
      ...adapter.optionsFactory(db),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    outbox = new PostgresSubscriptionSyncOutbox(tx);
  });
  afterEach(async () => {
    await db.getRepository(SubscriptionSyncOutboxRecord).clear();
  });
  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });
  it('rolls outgoing work back with its enclosing state transaction', async () => {
    await expect(
      tx.withTransaction(async () => {
        const pending = createdEvent();
        await outbox.append(pending.event.orgId, [pending]);
        throw new Error('later state mutation failed');
      }),
    ).rejects.toThrow();
    expect(await db.getRepository(SubscriptionSyncOutboxRecord).count()).toBe(
      0,
    );
  });
  it('preserves dates and a stable delivery identity across process recovery', async () => {
    const at = new Date('2026-10-20T00:00:00Z');
    const pending = createdEvent(randomUUID(), at);
    await outbox.append(pending.event.orgId, [pending]);
    const claimed = await outbox.claim();
    expect(claimed?.pending.event).toEqual(pending.event);
    await db
      .getRepository(SubscriptionSyncOutboxRecord)
      .update({ id: claimed!.id }, { availableAt: new Date(0) });
    const recovered = await new PostgresSubscriptionSyncOutbox(tx).claim();
    expect(recovered?.id).toBe(claimed?.id);
    expect(recovered?.createdAt).toEqual(claimed?.createdAt);
    expect(recovered?.claimToken).not.toBe(claimed?.claimToken);
  });
  it('fences stale workers and holds later events until the current claim completes', async () => {
    const orgId = randomUUID();
    const created = createdEvent(orgId);
    await outbox.append(orgId, [
      {
        name: SubscriptionCancelledEvent.EVENT_NAME,
        event: new SubscriptionCancelledEvent(orgId, created.event.payload),
      },
      created,
    ]);
    const first = (await outbox.claim())!;
    expect(await outbox.claim()).toBeNull();
    await db
      .getRepository(SubscriptionSyncOutboxRecord)
      .update({ id: first.id }, { availableAt: new Date(0) });
    const second = (await outbox.claim())!;
    await outbox.complete(first.id, first.claimToken);
    await outbox.retry(first.id, first.claimToken);
    expect(await db.getRepository(SubscriptionSyncOutboxRecord).count()).toBe(
      2,
    );
    expect(await outbox.claim()).toBeNull();
    await outbox.complete(second.id, second.claimToken);
    expect((await outbox.claim())?.pending.name).toBe('subscription.created');
  });
  it('allows different organizations to progress concurrently', async () => {
    for (const orgId of [randomUUID(), randomUUID()]) {
      await outbox.append(orgId, [createdEvent(orgId)]);
    }
    const [first, second] = await Promise.all([outbox.claim(), outbox.claim()]);
    expect(first?.id).toBeDefined();
    expect(second?.id).toBeDefined();
    expect(first?.orgId).not.toBe(second?.orgId);
  });
  it.each(['corrupt-bytes', 'unknown-name', 'malformed-payload'])(
    'holds %s for repair without blocking another organization or losing order',
    async (failure) => {
      const orgId = randomUUID();
      const pending = createdEvent(orgId);
      await outbox.append(orgId, [pending, createdEvent(orgId)]);
      const otherOrg = randomUUID();
      await outbox.append(otherOrg, [createdEvent(otherOrg)]);
      const records = db.getRepository(SubscriptionSyncOutboxRecord);
      const [blocked, following, other] = await records.find({
        order: { sequence: 'ASC' },
      });
      let broken: Partial<SubscriptionSyncOutboxRecord>;
      if (failure === 'corrupt-bytes')
        broken = { payload: Buffer.from('invalid v8 bytes') };
      else if (failure === 'unknown-name')
        broken = { eventName: 'subscription.unsupported' };
      else broken = { payload: serialize({ orgId, payload: {} }) };
      await records.update({ id: blocked.id }, broken);
      const handler = { sendWebhook: jest.fn().mockResolvedValue(undefined) };
      const service = new SubscriptionSyncEventsService(
        new EventEmitter2(),
        outbox,
        new DeliverBillingWebhookUseCase(handler),
      );
      await service.flush();
      await service.flush();
      expect(handler.sendWebhook.mock.calls.map(([event]) => event.id)).toEqual(
        [other.id],
      );
      expect(await records.countBy({ orgId })).toBe(2);
      await records.update(
        { id: blocked.id },
        {
          eventName: pending.name,
          payload: serialize(pending.event),
          availableAt: new Date(0),
        },
      );
      await service.flush();
      expect(handler.sendWebhook.mock.calls.map(([event]) => event.id)).toEqual(
        [other.id, blocked.id, following.id],
      );
      expect(await records.count()).toBe(0);
    },
  );
});
