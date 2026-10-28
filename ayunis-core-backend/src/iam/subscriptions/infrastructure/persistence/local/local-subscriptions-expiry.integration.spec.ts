import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProcessExpiredSubscriptionsUseCase } from 'src/iam/subscriptions/application/use-cases/process-expired-subscriptions/process-expired-subscriptions.use-case';
import { SubscriptionExpiredEvent } from 'src/iam/subscriptions/application/events/subscription-expired.event';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { SubscriptionBillingInfoMapper } from 'src/iam/subscriptions/infrastructure/persistence/local/mappers/subscription-billing-info.mapper';
import { SubscriptionMapper } from 'src/iam/subscriptions/infrastructure/persistence/local/mappers/subscription.mapper';
import { SubscriptionRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription.record';
import { LocalSubscriptionsRepository } from './local-subscriptions.repository';

const subscriptionSchema = new EntitySchema<
  SubscriptionRecord & { type: string }
>({
  name: 'SubscriptionRecord',
  target: SubscriptionRecord,
  tableName: 'subscriptions',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    orgId: { type: String },
    type: { type: String },
    startsAt: { type: 'timestamp' },
    cancelledAt: { type: 'timestamp', nullable: true },
    endsAt: { type: 'timestamp', nullable: true },
    expiryProcessedAt: { type: 'timestamp', nullable: true },
  },
});

interface SubscriptionFixture {
  startsAt: string;
  cancelledAt?: string;
  endsAt?: string;
  expiryProcessedAt?: string;
}

function onExpiry(
  emitter: EventEmitter2,
  listener: (event: SubscriptionExpiredEvent) => unknown,
): void {
  emitter.on(SubscriptionExpiredEvent.EVENT_NAME, listener);
}

describe('LocalSubscriptionsRepository expiry claim', () => {
  const now = new Date('2026-10-27T06:00:00.000Z');
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalSubscriptionsRepository;
  let txHost: TransactionHost<TransactionalAdapterTypeOrm>;
  let emitter: EventEmitter2;
  let useCase: ProcessExpiredSubscriptionsUseCase;

  beforeAll(async () => {
    schemaName = `ayc1429_expiry_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      logging: false,
      entities: [subscriptionSchema],
      migrations: [],
      migrationsRun: false,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();

    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    txHost = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(dataSource),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    const mapper = new SubscriptionMapper(new SubscriptionBillingInfoMapper());
    const passThroughMapper = {
      toRecord: mapper.toRecord.bind(mapper),
      toDomain: (record: SubscriptionRecord) =>
        new UsageBasedSubscription({
          ...record,
          monthlyCredits: 500,
          billingInfo: new SubscriptionBillingInfo({
            companyName: 'Expiry test',
            street: 'Test',
            houseNumber: '1',
            postalCode: '10115',
            city: 'Berlin',
            country: 'DE',
          }),
        }),
    } as unknown as SubscriptionMapper;
    repository = new LocalSubscriptionsRepository(
      passThroughMapper,
      {} as SubscriptionBillingInfoMapper,
      dataSource,
      txHost,
    );
  });

  beforeEach(async () => {
    await dataSource.getRepository(SubscriptionRecord).clear();
    emitter = new EventEmitter2();
    useCase = new ProcessExpiredSubscriptionsUseCase(repository, emitter);
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  async function insert(fixture: SubscriptionFixture): Promise<UUID> {
    const id = randomUUID();
    await dataSource.getRepository(SubscriptionRecord).insert({
      id,
      orgId: randomUUID(),
      type: 'USAGE_BASED',
      startsAt: new Date(fixture.startsAt),
      cancelledAt: fixture.cancelledAt ? new Date(fixture.cancelledAt) : null,
      endsAt: fixture.endsAt ? new Date(fixture.endsAt) : null,
      expiryProcessedAt: fixture.expiryProcessedAt
        ? new Date(fixture.expiryProcessedAt)
        : null,
    } as Partial<SubscriptionRecord>);
    return id;
  }

  async function processedAtOf(id: UUID): Promise<Date | null> {
    const record = await dataSource
      .getRepository(SubscriptionRecord)
      .findOneByOrFail({ id });
    return record.expiryProcessedAt;
  }

  async function elapsed(): Promise<UUID> {
    return insert({ startsAt: '2026-07-01', endsAt: '2026-10-01' });
  }

  it('claims an elapsed uncancelled term once', async () => {
    const id = await elapsed();
    await expect(repository.findUnprocessedExpiryIds(now)).resolves.toEqual([
      id,
    ]);
    await expect(
      txHost.withTransaction(() => repository.claimUnprocessedExpiry(id, now)),
    ).resolves.toMatchObject({ id });
    await expect(
      repository.claimUnprocessedExpiry(id, now),
    ).resolves.toBeNull();
    await expect(repository.findUnprocessedExpiryIds(now)).resolves.toEqual([]);
    await expect(processedAtOf(id)).resolves.toEqual(now);
  });

  it('preserves the claimed marker when saving a mapped domain subscription', async () => {
    const id = await elapsed();
    const subscription = await repository.claimUnprocessedExpiry(id, now);
    expect(subscription).not.toBeNull();
    await repository.update(subscription!);
    await expect(processedAtOf(id)).resolves.toEqual(now);
    await expect(repository.findUnprocessedExpiryIds(now)).resolves.toEqual([]);
  });

  it('leaves cancelled, open-ended, running, and already processed rows alone', async () => {
    const ids = await Promise.all([
      insert({
        startsAt: '2026-07-01',
        cancelledAt: '2026-09-15',
        endsAt: '2026-10-01',
      }),
      insert({ startsAt: '2026-07-01' }),
      insert({ startsAt: '2026-10-01', endsAt: '2026-12-01' }),
      insert({
        startsAt: '2026-05-01',
        endsAt: '2026-08-01',
        expiryProcessedAt: '2026-08-01',
      }),
    ]);
    await expect(repository.findUnprocessedExpiryIds(now)).resolves.toEqual([]);
    for (const id of ids) {
      await expect(
        repository.claimUnprocessedExpiry(id, now),
      ).resolves.toBeNull();
    }
  });

  it('rolls back a failed expiry and retries it without repeating successful expiries', async () => {
    const failed = await elapsed();
    const successful = await elapsed();
    let shouldFail = true;
    const seen: string[] = [];
    onExpiry(emitter, async (event: SubscriptionExpiredEvent) => {
      seen.push(event.payload.id);
      if (event.payload.id === failed && shouldFail)
        throw new Error('receiver unavailable');
    });
    await expect(useCase.execute()).rejects.toThrow();
    await expect(processedAtOf(failed)).resolves.toBeNull();
    expect(await processedAtOf(successful)).toBeInstanceOf(Date);
    shouldFail = false;
    await expect(useCase.execute()).resolves.toBe(1);
    expect(seen.filter((id) => id === failed)).toHaveLength(2);
    expect(seen.filter((id) => id === successful)).toHaveLength(1);
  });

  it('rolls back transaction-bound listener writes with the processed marker', async () => {
    const id = await elapsed();
    onExpiry(emitter, async () => {
      await txHost.tx
        .getRepository(SubscriptionRecord)
        .update(id, { cancelledAt: now });
    });
    onExpiry(emitter, async () => {
      throw new Error('receiver unavailable');
    });
    await expect(useCase.execute()).rejects.toThrow();
    const record = await dataSource
      .getRepository(SubscriptionRecord)
      .findOneByOrFail({ id });
    expect(record.expiryProcessedAt).toBeNull();
    expect(record.cancelledAt).toBeNull();
  });

  it('announces once when two sweeps race for the same expiry', async () => {
    const id = await elapsed();
    const seen: string[] = [];
    onExpiry(emitter, async (event: SubscriptionExpiredEvent) => {
      seen.push(event.payload.id);
    });
    const results = await Promise.all([useCase.execute(), useCase.execute()]);
    expect(results.reduce((sum, count) => sum + count, 0)).toBe(1);
    expect(seen).toEqual([id]);
  });

  it('rechecks cancellation after scanning candidates', async () => {
    const id = await elapsed();
    await expect(repository.findUnprocessedExpiryIds(now)).resolves.toEqual([
      id,
    ]);
    await dataSource
      .getRepository(SubscriptionRecord)
      .update(id, { cancelledAt: now });
    await expect(
      repository.claimUnprocessedExpiry(id, now),
    ).resolves.toBeNull();
    await expect(processedAtOf(id)).resolves.toBeNull();
  });
});
