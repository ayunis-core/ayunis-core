import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import type { SubscriptionBillingInfoMapper } from 'src/iam/subscriptions/infrastructure/persistence/local/mappers/subscription-billing-info.mapper';
import type { SubscriptionMapper } from 'src/iam/subscriptions/infrastructure/persistence/local/mappers/subscription.mapper';
import { SubscriptionAccessAdjustmentRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription-access-adjustment.record';
import { SubscriptionRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription.record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { LocalSubscriptionsRepository } from './local-subscriptions.repository';

const orgSchema = new EntitySchema<OrgRecord>({
  name: 'OrgRecord',
  target: OrgRecord,
  tableName: 'orgs',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
});

const userSchema = new EntitySchema<UserRecord>({
  name: 'UserRecord',
  target: UserRecord,
  tableName: 'users',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
});

const subscriptionSchema = new EntitySchema<SubscriptionRecord>({
  name: 'SubscriptionRecord',
  target: SubscriptionRecord,
  tableName: 'subscriptions',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    orgId: { type: String },
    accessEndsAt: { type: 'timestamp', nullable: true },
  },
});

const adjustmentSchema = new EntitySchema<SubscriptionAccessAdjustmentRecord>({
  name: 'SubscriptionAccessAdjustmentRecord',
  target: SubscriptionAccessAdjustmentRecord,
  tableName: 'subscription_access_adjustments',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    subscriptionId: { type: String },
    orgId: { type: String },
    changedByUserId: { type: String, nullable: true },
    previousAccessEndsAt: { type: 'timestamp', nullable: true },
    accessEndsAt: { type: 'timestamp' },
    reason: { type: String, length: 500 },
  },
  relations: {
    subscription: {
      type: 'many-to-one',
      target: 'SubscriptionRecord',
      joinColumn: { name: 'subscriptionId' },
      onDelete: 'CASCADE',
    },
    org: {
      type: 'many-to-one',
      target: 'OrgRecord',
      joinColumn: { name: 'orgId' },
      onDelete: 'CASCADE',
    },
    changedByUser: {
      type: 'many-to-one',
      target: 'UserRecord',
      joinColumn: { name: 'changedByUserId' },
      onDelete: 'SET NULL',
      nullable: true,
    },
  },
});

describe('LocalSubscriptionsRepository access adjustment transaction', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let txHost: TransactionHost<TransactionalAdapterTypeOrm>;
  let repository: LocalSubscriptionsRepository;

  beforeAll(async () => {
    schemaName = `subscription_adjustment_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      logging: false,
      entities: [orgSchema, userSchema, subscriptionSchema, adjustmentSchema],
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
    repository = new LocalSubscriptionsRepository(
      {} as SubscriptionMapper,
      {} as SubscriptionBillingInfoMapper,
      dataSource,
      txHost,
    );
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  it('rolls back the access end when the audit insert fails', async () => {
    const orgId = randomUUID();
    const subscriptionId = randomUUID();
    const missingUserId = randomUUID();
    const accessEndsAt = new Date('2026-08-01T00:00:00.000Z');
    await insertFixture(orgId, subscriptionId);
    const subscription = new UsageBasedSubscription({
      id: subscriptionId,
      orgId,
      monthlyCredits: 1_000,
      startsAt: new Date('2026-07-01T00:00:00.000Z'),
      billingInfo: new SubscriptionBillingInfo({
        companyName: 'Atomic Audit GmbH',
        street: 'Test Street',
        houseNumber: '1',
        postalCode: '10115',
        city: 'Berlin',
        country: 'Germany',
      }),
    });
    subscription.accessEndsAt = accessEndsAt;

    await expect(
      txHost.withTransaction(() =>
        repository.applyAccessEndAdjustments({
          orgId,
          requestingUserId: missingUserId,
          reason: 'Contract transition correction',
          adjustments: [
            {
              subscription,
              previousAccessEndsAt: null,
            },
          ],
        }),
      ),
    ).rejects.toThrow();

    const persistedSubscriptions = await dataSource.query(
      `SELECT "accessEndsAt" FROM "${schemaName}"."subscriptions" WHERE id = $1`,
      [subscriptionId],
    );
    const audits = await dataSource.query(
      `SELECT id FROM "${schemaName}"."subscription_access_adjustments"`,
    );
    expect(persistedSubscriptions[0].accessEndsAt).toBeNull();
    expect(audits).toHaveLength(0);
  });

  async function insertFixture(orgId: UUID, subscriptionId: UUID) {
    await dataSource.query(
      `INSERT INTO "${schemaName}"."orgs" (id) VALUES ($1)`,
      [orgId],
    );
    await dataSource.query(
      `INSERT INTO "${schemaName}"."subscriptions" (id, "orgId") VALUES ($1, $2)`,
      [subscriptionId, orgId],
    );
  }
});
