import 'src/config/env';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { FynnOutboxRecord } from './schema/fynn-outbox.record';
import { PostgresFynnOutbox } from './postgres-fynn-outbox';

describe('Fynn durable outbox in PostgreSQL', () => {
  let db: DataSource;
  let outbox: PostgresFynnOutbox;
  let tx: TransactionHost<TransactionalAdapterTypeOrm>;
  const schema = `fynn_outbox_${randomUUID().replaceAll('-', '')}`;
  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [FynnOutboxRecord],
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
    outbox = new PostgresFynnOutbox(tx);
  });
  afterEach(async () => {
    await db.getRepository(FynnOutboxRecord).clear();
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
        await outbox.append(randomUUID(), [
          { name: 'subscription.created', event: {} },
        ]);
        throw new Error('later state mutation failed');
      }),
    ).rejects.toThrow();
    expect(await db.getRepository(FynnOutboxRecord).count()).toBe(0);
  });
  it('preserves dates and a stable delivery identity across process recovery', async () => {
    const at = new Date('2026-10-20T00:00:00Z');
    await outbox.append(randomUUID(), [
      { name: 'subscription.created', event: { startsAt: at } },
    ]);
    const claimed = await outbox.claim();
    expect(claimed?.pending.event).toEqual({ startsAt: at });
    await db
      .getRepository(FynnOutboxRecord)
      .update({ id: claimed!.id }, { availableAt: new Date(0) });
    const recovered = await new PostgresFynnOutbox(tx).claim();
    expect(recovered?.id).toBe(claimed?.id);
    expect(recovered?.createdAt).toEqual(claimed?.createdAt);
    expect(recovered?.claimToken).not.toBe(claimed?.claimToken);
  });
  it('fences stale workers and holds later events until the current claim completes', async () => {
    const orgId = randomUUID();
    await outbox.append(orgId, [
      { name: 'subscription.cancelled', event: {} },
      { name: 'subscription.created', event: {} },
    ]);
    const first = (await outbox.claim())!;
    expect(await outbox.claim()).toBeNull();
    await db
      .getRepository(FynnOutboxRecord)
      .update({ id: first.id }, { availableAt: new Date(0) });
    const second = (await outbox.claim())!;
    await outbox.complete(first.id, first.claimToken);
    await outbox.retry(first.id, first.claimToken);
    expect(await db.getRepository(FynnOutboxRecord).count()).toBe(2);
    expect(await outbox.claim()).toBeNull();
    await outbox.complete(second.id, second.claimToken);
    expect((await outbox.claim())?.pending.name).toBe('subscription.created');
  });
  it('allows different organizations to progress concurrently', async () => {
    await outbox.append(randomUUID(), [
      { name: 'subscription.created', event: {} },
    ]);
    await outbox.append(randomUUID(), [
      { name: 'subscription.created', event: {} },
    ]);
    const [first, second] = await Promise.all([outbox.claim(), outbox.claim()]);
    expect(first?.id).toBeDefined();
    expect(second?.id).toBeDefined();
    expect(first?.orgId).not.toBe(second?.orgId);
  });
});
