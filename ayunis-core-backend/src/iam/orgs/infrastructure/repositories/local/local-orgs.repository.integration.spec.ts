import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import {
  ORG_LIFECYCLE_STATUSES,
  type OrgLifecycleStatus,
} from 'src/iam/orgs/application/models/org-lifecycle-status';
import type { OrgsFilters } from 'src/iam/orgs/application/ports/orgs.repository';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { getEffectiveAccessEnd } from 'src/iam/subscriptions/application/util/get-effective-access-end';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import {
  type SeatBasedSubscriptionRecord,
  SubscriptionRecord,
} from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription.record';
import { TrialRecord } from 'src/iam/trials/infrastructure/persistence/local/schema/trial.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { LocalOrgsRepository } from './local-orgs.repository';

const NOW = new Date('2026-03-30T12:00:00.000Z');

const orgSchema = new EntitySchema<OrgRecord>({
  name: 'OrgRecord',
  target: OrgRecord,
  tableName: 'orgs',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    name: { type: String },
    archived: { type: Boolean, default: false },
    hideIndividualUsage: { type: Boolean, default: false },
    sessionVersion: { type: 'integer', default: 0 },
  },
  relations: {
    users: { type: 'one-to-many', target: 'UserRecord', inverseSide: 'org' },
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
  relations: {
    org: { type: 'many-to-one', target: 'OrgRecord', inverseSide: 'users' },
  },
});

const subscriptionSchema = new EntitySchema<
  SeatBasedSubscriptionRecord & { type: SubscriptionType }
>({
  name: 'SubscriptionRecord',
  target: SubscriptionRecord,
  tableName: 'subscriptions',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    type: { type: String },
    orgId: { type: String },
    startsAt: { type: 'timestamp' },
    cancelledAt: { type: 'timestamp', nullable: true },
    accessEndsAt: { type: 'timestamp', nullable: true },
    renewalCycle: { type: String, nullable: true },
    renewalCycleAnchor: { type: 'timestamp', nullable: true },
  },
});

const trialSchema = new EntitySchema<TrialRecord>({
  name: 'TrialRecord',
  target: TrialRecord,
  tableName: 'trials',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    orgId: { type: String },
    messagesSent: { type: 'integer', default: 0 },
    maxMessages: { type: 'integer' },
  },
});

const billingInfo = new SubscriptionBillingInfo({
  companyName: 'Gemeinde Musterstadt',
  street: 'Hauptstraße',
  houseNumber: '1',
  postalCode: '12345',
  city: 'Musterstadt',
  country: 'DE',
});

type Dates = Partial<{
  startsAt: Date;
  cancelledAt: Date;
  accessEndsAt: Date;
  renewalCycleAnchor: Date;
}>;

const seatBased = (cycle: RenewalCycle, dates: Dates = {}) => {
  const anchor = dates.renewalCycleAnchor ?? new Date('2025-01-15T00:00:00Z');
  return new SeatBasedSubscription({
    orgId: randomUUID(),
    noOfSeats: 10,
    pricePerSeat: 9.99,
    renewalCycle: cycle,
    renewalCycleAnchor: anchor,
    startsAt: dates.startsAt ?? anchor,
    cancelledAt: dates.cancelledAt ?? null,
    accessEndsAt: dates.accessEndsAt ?? null,
    billingInfo,
  });
};

const usageBased = (dates: Dates = {}) =>
  new UsageBasedSubscription({
    orgId: randomUUID(),
    monthlyCredits: 1000,
    startsAt: dates.startsAt ?? new Date('2025-01-15T00:00:00Z'),
    cancelledAt: dates.cancelledAt ?? null,
    accessEndsAt: dates.accessEndsAt ?? null,
    billingInfo,
  });

const byName = (names: string[]) =>
  [...names].sort((a, b) => a.localeCompare(b));

const at = (iso: string) => new Date(`${iso}T09:00:00Z`);

type OrgCase = {
  name: string;
  archived?: boolean;
  trial?: boolean;
  subscriptions?: Subscription[];
};

const cases: OrgCase[] = [
  { name: 'never had a trial or a subscription' },
  { name: 'trial only', trial: true },
  {
    name: 'archived with a running subscription',
    archived: true,
    subscriptions: [usageBased()],
  },
  { name: 'archived without anything', archived: true },
  {
    name: 'open-ended seat-based',
    trial: true,
    subscriptions: [seatBased(RenewalCycle.MONTHLY)],
  },
  { name: 'open-ended usage-based', subscriptions: [usageBased()] },
  {
    name: 'scheduled to start next month',
    subscriptions: [
      seatBased(RenewalCycle.MONTHLY, { startsAt: at('2026-04-15') }),
    ],
  },
  {
    name: 'explicit access end in the future',
    subscriptions: [
      usageBased({
        cancelledAt: at('2026-03-01'),
        accessEndsAt: at('2026-04-01'),
      }),
    ],
  },
  {
    name: 'explicit access end in the past',
    subscriptions: [usageBased({ accessEndsAt: at('2026-03-01') })],
  },
  {
    name: 'trial plus a subscription that ended',
    trial: true,
    subscriptions: [usageBased({ accessEndsAt: at('2026-03-01') })],
  },
  {
    name: 'ended subscription with a scheduled renewal',
    subscriptions: [
      usageBased({ accessEndsAt: at('2026-03-01') }),
      usageBased({ startsAt: at('2026-04-15') }),
    ],
  },
  {
    name: 'cancelled before start with an explicit access end',
    subscriptions: [
      seatBased(RenewalCycle.MONTHLY, {
        renewalCycleAnchor: at('2026-02-01'),
        cancelledAt: at('2026-01-20'),
        accessEndsAt: at('2026-02-01'),
      }),
    ],
  },
  {
    name: 'legacy monthly cancellation inside the paid period',
    subscriptions: [
      seatBased(RenewalCycle.MONTHLY, { cancelledAt: at('2026-03-20') }),
    ],
  },
  {
    name: 'legacy monthly cancellation whose period has ended',
    subscriptions: [
      seatBased(RenewalCycle.MONTHLY, { cancelledAt: at('2026-03-10') }),
    ],
  },
  {
    name: 'legacy yearly cancellation inside the paid year',
    subscriptions: [
      seatBased(RenewalCycle.YEARLY, { cancelledAt: at('2026-02-01') }),
    ],
  },
  {
    name: 'legacy yearly cancellation whose year has ended',
    subscriptions: [
      seatBased(RenewalCycle.YEARLY, {
        renewalCycleAnchor: new Date('2024-01-15T00:00:00Z'),
        cancelledAt: at('2024-06-01'),
      }),
    ],
  },
  {
    // Renewals clamp and stick at day 28 (Feb 28 -> Mar 28), so the period
    // ended on Mar 28 even though Jan 31 + 14 months is Mar 31.
    name: 'legacy cancellation on a month-end anchor after the clamped renewal',
    subscriptions: [
      seatBased(RenewalCycle.MONTHLY, {
        renewalCycleAnchor: new Date('2025-01-31T00:00:00Z'),
        cancelledAt: at('2026-03-27'),
      }),
    ],
  },
  {
    name: 'legacy cancellation before the subscription started',
    subscriptions: [
      seatBased(RenewalCycle.MONTHLY, {
        renewalCycleAnchor: new Date('2026-03-01T00:00:00Z'),
        cancelledAt: new Date('2026-02-20T00:00:00Z'),
      }),
    ],
  },
  {
    name: 'legacy usage-based cancellation',
    subscriptions: [usageBased({ cancelledAt: at('2026-03-20') })],
  },
  {
    name: 'legacy usage-based cancellation on its start date',
    subscriptions: [
      usageBased({ startsAt: at('2026-01-10'), cancelledAt: at('2026-01-10') }),
    ],
  },
  {
    name: 'ended subscription replaced by an active one',
    subscriptions: [
      usageBased({ accessEndsAt: at('2025-12-31') }),
      seatBased(RenewalCycle.MONTHLY, { startsAt: at('2025-12-31') }),
    ],
  },
];

const wasEverActive = (subscription: Subscription) => {
  const accessEnd = getEffectiveAccessEnd(subscription);
  return (
    subscription.startsAt <= new Date() &&
    (accessEnd === null || accessEnd > subscription.startsAt)
  );
};

const expectedStatus = ({
  archived,
  trial,
  subscriptions = [],
}: OrgCase): OrgLifecycleStatus => {
  if (archived) return 'archived';
  if (subscriptions.some(isActive)) return 'paying';
  if (subscriptions.some(wasEverActive)) return 'expired';
  if (trial || subscriptions.length > 0) return 'trial';
  return 'no-plan';
};

const namesWithStatus = (status: OrgLifecycleStatus) =>
  byName(cases.filter((c) => expectedStatus(c) === status).map((c) => c.name));

describe('LocalOrgsRepository super-admin lifecycle status', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalOrgsRepository;

  beforeAll(async () => {
    schemaName = `orgs_lifecycle_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      logging: false,
      entities: [orgSchema, userSchema, subscriptionSchema, trialSchema],
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
    repository = new LocalOrgsRepository(
      new TransactionHost<TransactionalAdapterTypeOrm>({
        ...adapter.optionsFactory(dataSource),
        connectionName: undefined,
        enableTransactionProxy: false,
        defaultTxOptions: {},
        extraProviderTokens: [],
      }),
    );

    for (const { name, archived = false, trial, subscriptions = [] } of cases) {
      const orgId = randomUUID();
      await dataSource
        .getRepository(OrgRecord)
        .insert({ id: orgId, name, archived });
      if (trial) {
        await dataSource.getRepository(TrialRecord).insert({
          id: randomUUID(),
          orgId,
          maxMessages: 100,
        });
      }
      for (const subscription of subscriptions) {
        await dataSource.getRepository(SubscriptionRecord).insert({
          id: randomUUID(),
          orgId,
          type:
            subscription instanceof SeatBasedSubscription
              ? SubscriptionType.SEAT_BASED
              : SubscriptionType.USAGE_BASED,
          startsAt: subscription.startsAt,
          cancelledAt: subscription.cancelledAt,
          accessEndsAt: subscription.accessEndsAt,
          ...(subscription instanceof SeatBasedSubscription && {
            renewalCycle: subscription.renewalCycle,
            renewalCycleAnchor: subscription.renewalCycleAnchor,
          }),
        } as Partial<SubscriptionRecord>);
      }
    }
  });

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: [...timersOtherThanDate] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  const list = (filters: OrgsFilters) =>
    repository.findAllForSuperAdmin({ limit: 100, offset: 0 }, filters);

  it.each(ORG_LIFECYCLE_STATUSES)('has at least one %s case', (status) => {
    expect(namesWithStatus(status)).not.toHaveLength(0);
  });

  it.each(ORG_LIFECYCLE_STATUSES)(
    'filters to exactly the %s organizations',
    async (status) => {
      const page = await list({ lifecycle: status });
      expect(byName(page.data.map((org) => org.name))).toEqual(
        namesWithStatus(status),
      );
      expect(page.total).toBe(namesWithStatus(status).length);
    },
  );

  it('lists every organization, archived included, when the filter is all or omitted', async () => {
    expect((await list({})).total).toBe(cases.length);
    expect((await list({ lifecycle: 'all' })).total).toBe(cases.length);
  });

  it('combines the filter with search', async () => {
    const page = await list({ lifecycle: 'paying', search: 'legacy' });
    expect(byName(page.data.map((org) => org.name))).toEqual([
      'legacy monthly cancellation inside the paid period',
      'legacy yearly cancellation inside the paid year',
    ]);
  });

  it('reports the lifecycle status of each given organization', async () => {
    const page = await list({});
    const statuses = await repository.findLifecycleStatuses(
      page.data.map((org) => org.id),
    );

    expect(
      Object.fromEntries(
        page.data.map((org) => [org.name, statuses.get(org.id)]),
      ),
    ).toEqual(
      Object.fromEntries(cases.map((c) => [c.name, expectedStatus(c)])),
    );
  });

  it('reports nothing for an empty page', async () => {
    expect((await repository.findLifecycleStatuses([])).size).toBe(0);
  });
});

const timersOtherThanDate = [
  'hrtime',
  'nextTick',
  'performance',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
] as const;
