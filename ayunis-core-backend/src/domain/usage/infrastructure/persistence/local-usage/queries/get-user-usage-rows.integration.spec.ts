import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { UsageRecord } from 'src/domain/usage/infrastructure/persistence/local-usage/schema/usage.record';
import { getUserUsageRows } from './get-user-usage-rows.db-query';
import { countUsersForUserUsage } from './count-users-for-user-usage.db-query';

const userSchema = new EntitySchema<UserRecord>({
  name: 'UserRecord',
  target: UserRecord,
  tableName: 'users',
  columns: {
    id: { type: String, primary: true },
    name: { type: String },
    email: { type: String },
    orgId: { type: String },
  },
});

const usageSchema = new EntitySchema<UsageRecord>({
  name: 'UsageRecord',
  target: UsageRecord,
  tableName: 'usage',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp' },
    userId: { type: String, nullable: true },
    organizationId: { type: String },
    creditsConsumed: {
      type: 'decimal',
      precision: 16,
      scale: 6,
      nullable: true,
    },
  },
});

const SORT = {
  credits: 'COALESCE(SUM(usage.creditsConsumed), 0)',
  requests: 'COUNT(usage.id)',
  lastActivity: 'MAX(usage.createdAt)',
};

const startDate = new Date('2026-03-01T00:00:00.000Z');
const endDate = new Date('2026-04-01T00:00:00.000Z');

const orgId = randomUUID();
const otherOrgId = randomUUID();
const aliceId = randomUUID();
const bobId = randomUUID();
const carolId = randomUUID();
const daveId = randomUUID();

describe('getUserUsageRows / countUsersForUserUsage', () => {
  let dataSource: DataSource;
  let schemaName: string;

  beforeAll(async () => {
    schemaName = `user_usage_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [userSchema, usageSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    await seed(dataSource);
  }, 30_000);

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  }, 30_000);

  function rows(
    overrides: Partial<{
      organizationId: UUID;
      sortField: string;
      sortOrder: 'ASC' | 'DESC';
      offset: number;
      limit: number;
      searchTerm: string;
    }> = {},
  ) {
    return getUserUsageRows({
      userRepository: dataSource.getRepository(UserRecord),
      organizationId: orgId,
      startDate,
      endDate,
      sortField: SORT.credits,
      sortOrder: 'DESC',
      offset: 0,
      limit: 10,
      ...overrides,
    });
  }

  it('sums credits and requests in the range per user, with all-time last activity in the org', async () => {
    const result = await rows();
    const alice = result.find((row) => row.userId === aliceId);
    const carol = result.find((row) => row.userId === carolId);

    expect(alice).toMatchObject({
      userName: 'Alice',
      userEmail: 'alice@example.org',
      requests: '2',
    });
    expect(Number(alice?.credits)).toBe(3);
    expect(alice?.lastActivity).toEqual(new Date('2026-04-10T00:00:00.000Z'));
    expect(carol).toMatchObject({ requests: '0', lastActivity: null });
    expect(Number(carol?.credits)).toBe(0);
  });

  it('ignores usage the user produced in another organization', async () => {
    const result = await rows();
    const bob = result.find((row) => row.userId === bobId);

    expect(bob?.requests).toBe('1');
    expect(bob?.lastActivity).toEqual(new Date('2026-03-15T00:00:00.000Z'));
  });

  it('lists only users of the organization, sorted by credits then name', async () => {
    const result = await rows();

    expect(result.map((row) => row.userId)).toEqual([bobId, aliceId, carolId]);
  });

  it('sorts by requests and by last activity', async () => {
    const byRequests = await rows({ sortField: SORT.requests });
    const byLastActivity = await rows({
      sortField: SORT.lastActivity,
      sortOrder: 'ASC',
    });

    expect(byRequests.map((row) => row.userId)).toEqual([
      aliceId,
      bobId,
      carolId,
    ]);
    expect(byLastActivity.map((row) => row.userId)).toEqual([
      bobId,
      aliceId,
      carolId,
    ]);
  });

  it('paginates and filters by search term', async () => {
    const page = await rows({ offset: 1, limit: 1 });
    const searched = await rows({ searchTerm: 'ali' });

    expect(page.map((row) => row.userId)).toEqual([aliceId]);
    expect(searched.map((row) => row.userId)).toEqual([aliceId]);
  });

  it('counts the users of the organization matching the search term', async () => {
    const userRepository = dataSource.getRepository(UserRecord);
    const params = { userRepository, startDate, endDate };

    await expect(
      countUsersForUserUsage({ ...params, organizationId: orgId }),
    ).resolves.toBe(3);
    await expect(
      countUsersForUserUsage({
        ...params,
        organizationId: orgId,
        searchTerm: 'BOB@',
      }),
    ).resolves.toBe(1);
    await expect(
      countUsersForUserUsage({ ...params, organizationId: otherOrgId }),
    ).resolves.toBe(1);
  });
});

async function seed(dataSource: DataSource): Promise<void> {
  await dataSource.getRepository(UserRecord).insert([
    { id: aliceId, name: 'Alice', email: 'alice@example.org', orgId },
    { id: bobId, name: 'Bob', email: 'bob@example.org', orgId },
    { id: carolId, name: 'Carol', email: 'carol@example.org', orgId },
    {
      id: daveId,
      name: 'Dave',
      email: 'dave@example.org',
      orgId: otherOrgId,
    },
  ]);

  await dataSource
    .getRepository(UsageRecord)
    .insert([
      usage(aliceId, '2026-03-02T00:00:00.000Z', 1),
      usage(aliceId, '2026-03-03T00:00:00.000Z', 2),
      usage(aliceId, '2026-02-01T00:00:00.000Z', 100),
      usage(aliceId, '2026-04-10T00:00:00.000Z', 100),
      usage(bobId, '2026-03-15T00:00:00.000Z', 5),
      usage(bobId, '2026-05-01T00:00:00.000Z', 50, otherOrgId),
      usage(daveId, '2026-03-20T00:00:00.000Z', 7, otherOrgId),
    ]);
}

function usage(
  userId: UUID,
  at: string,
  creditsConsumed: number,
  organizationId: UUID = orgId,
): Partial<UsageRecord> {
  return {
    id: randomUUID(),
    createdAt: new Date(at),
    userId,
    organizationId,
    creditsConsumed,
  };
}
