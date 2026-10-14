import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import type { OrgsFilters } from 'src/iam/orgs/application/ports/orgs.repository';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
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

const cases: [string, Subscription[]][] = [
  ['trial only, no subscription', []],
  ['open-ended seat-based', [seatBased(RenewalCycle.MONTHLY)]],
  ['open-ended usage-based', [usageBased()]],
  [
    'scheduled to start next month',
    [seatBased(RenewalCycle.MONTHLY, { startsAt: at('2026-04-15') })],
  ],
  [
    'explicit access end in the future',
    [
      usageBased({
        cancelledAt: at('2026-03-01'),
        accessEndsAt: at('2026-04-01'),
      }),
    ],
  ],
  [
    'explicit access end in the past',
    [usageBased({ accessEndsAt: at('2026-03-01') })],
  ],
  [
    'legacy monthly cancellation inside the paid period',
    [seatBased(RenewalCycle.MONTHLY, { cancelledAt: at('2026-03-20') })],
  ],
  [
    'legacy monthly cancellation whose period has ended',
    [seatBased(RenewalCycle.MONTHLY, { cancelledAt: at('2026-03-10') })],
  ],
  [
    'legacy yearly cancellation inside the paid year',
    [seatBased(RenewalCycle.YEARLY, { cancelledAt: at('2026-02-01') })],
  ],
  [
    'legacy yearly cancellation whose year has ended',
    [
      seatBased(RenewalCycle.YEARLY, {
        renewalCycleAnchor: new Date('2024-01-15T00:00:00Z'),
        cancelledAt: at('2024-06-01'),
      }),
    ],
  ],
  [
    // Renewals clamp and stick at day 28 (Feb 28 -> Mar 28), so the period
    // ended on Mar 28 even though Jan 31 + 14 months is Mar 31.
    'legacy cancellation on a month-end anchor after the clamped renewal',
    [
      seatBased(RenewalCycle.MONTHLY, {
        renewalCycleAnchor: new Date('2025-01-31T00:00:00Z'),
        cancelledAt: at('2026-03-27'),
      }),
    ],
  ],
  [
    'legacy cancellation before the subscription started',
    [
      seatBased(RenewalCycle.MONTHLY, {
        renewalCycleAnchor: new Date('2026-03-01T00:00:00Z'),
        cancelledAt: new Date('2026-02-20T00:00:00Z'),
      }),
    ],
  ],
  [
    'legacy usage-based cancellation',
    [usageBased({ cancelledAt: at('2026-03-20') })],
  ],
  [
    'ended subscription replaced by an active one',
    [
      usageBased({ accessEndsAt: at('2025-12-31') }),
      seatBased(RenewalCycle.MONTHLY, { startsAt: at('2025-12-31') }),
    ],
  ],
];

describe('LocalOrgsRepository.findAllForSuperAdmin subscription filter', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalOrgsRepository;

  beforeAll(async () => {
    schemaName = `orgs_paying_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      logging: false,
      entities: [orgSchema, userSchema, subscriptionSchema],
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

    for (const [name, subscriptions] of cases) {
      const orgId = randomUUID();
      await dataSource.getRepository(OrgRecord).insert({ id: orgId, name });
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

  const list = async (filters: OrgsFilters) => {
    const page = await repository.findAllForSuperAdmin(
      { limit: 100, offset: 0 },
      { status: 'all', ...filters },
    );
    return page;
  };

  const payingCaseNames = () =>
    cases
      .filter(([, subscriptions]) => subscriptions.some(isActive))
      .map(([name]) => name)
      .sort((a, b) => a.localeCompare(b));

  it('covers both paying and non-paying organizations', () => {
    expect(payingCaseNames()).toEqual(
      [
        'ended subscription replaced by an active one',
        'explicit access end in the future',
        'legacy monthly cancellation inside the paid period',
        'legacy yearly cancellation inside the paid year',
        'open-ended seat-based',
        'open-ended usage-based',
      ].sort((a, b) => a.localeCompare(b)),
    );
  });

  it('lists exactly the organizations with a subscription that isActive', async () => {
    const page = await list({ subscription: 'paying' });
    expect(
      page.data.map((org) => org.name).sort((a, b) => a.localeCompare(b)),
    ).toEqual(payingCaseNames());
    expect(page.total).toBe(payingCaseNames().length);
  });

  it('lists every other organization as non-paying', async () => {
    const page = await list({ subscription: 'non-paying' });
    expect(
      page.data.map((org) => org.name).sort((a, b) => a.localeCompare(b)),
    ).toEqual(
      cases
        .map(([name]) => name)
        .filter((name) => !payingCaseNames().includes(name))
        .sort((a, b) => a.localeCompare(b)),
    );
  });

  it('keeps listing every organization when the filter is omitted', async () => {
    expect((await list({})).total).toBe(cases.length);
    expect((await list({ subscription: 'all' })).total).toBe(cases.length);
  });

  it('combines the filter with search', async () => {
    const page = await list({ subscription: 'paying', search: 'legacy' });
    expect(byName(page.data.map((org) => org.name))).toEqual([
      'legacy monthly cancellation inside the paid period',
      'legacy yearly cancellation inside the paid year',
    ]);
  });

  it('flags exactly the paying organizations among the given ids', async () => {
    const page = await list({});
    const nameById = new Map(page.data.map((org) => [org.id, org.name]));

    const payingIds = await repository.findPayingOrgIds([...nameById.keys()]);

    expect(byName(payingIds.map((id) => nameById.get(id) ?? id))).toEqual(
      payingCaseNames(),
    );
  });

  it('flags nothing for an empty page', async () => {
    expect(await repository.findPayingOrgIds([])).toEqual([]);
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
