import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { ApiKeyRecord } from 'src/iam/api-keys/infrastructure/repositories/local/schema/api-key.record';
import { UsageQueryMapper } from 'src/domain/usage/infrastructure/persistence/local-usage/mappers/usage-query.mapper';
import { UsageRecord } from 'src/domain/usage/infrastructure/persistence/local-usage/schema/usage.record';
import { getApiKeyUsageRows } from './get-api-key-usage-rows.db-query';

const apiKeySchema = new EntitySchema<ApiKeyRecord>({
  name: 'ApiKeyRecord',
  target: ApiKeyRecord,
  tableName: 'api_keys',
  columns: {
    id: { type: String, primary: true },
    name: { type: String },
    expiresAt: { name: 'expires_at', type: 'timestamptz', nullable: true },
    revokedAt: { name: 'revoked_at', type: 'timestamptz', nullable: true },
    orgId: { name: 'org_id', type: String },
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
    apiKeyId: { type: String, nullable: true },
    organizationId: { type: String },
    inputTokens: { type: 'integer' },
    outputTokens: { type: 'integer' },
    totalTokens: { type: 'integer' },
    creditsConsumed: {
      type: 'decimal',
      precision: 16,
      scale: 6,
      nullable: true,
    },
  },
});

const startDate = new Date('2026-03-01T00:00:00.000Z');
const endDate = new Date('2026-04-01T00:00:00.000Z');

const orgId = randomUUID();
const otherOrgId = randomUUID();
const activeKeyId = randomUUID();
const revokedKeyId = randomUUID();
const recreatedKeyId = randomUUID();
const oldUsageKeyId = randomUUID();
const otherOrgKeyId = randomUUID();

describe('getApiKeyUsageRows', () => {
  let dataSource: DataSource;
  let schemaName: string;

  beforeAll(async () => {
    schemaName = `api_key_usage_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [apiKeySchema, usageSchema],
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
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  async function query(organizationId: UUID, withRange = true) {
    const rows = await getApiKeyUsageRows({
      apiKeyRepository: dataSource.getRepository(ApiKeyRecord),
      organizationId,
      startDate: withRange ? startDate : undefined,
      endDate: withRange ? endDate : undefined,
    });
    const mapper = new UsageQueryMapper();
    return rows.map((row) => mapper.mapApiKeyUsageRow(row));
  }

  it('aggregates API key usage in the range and ignores user usage', async () => {
    const items = await query(orgId);
    const active = items.find((item) => item.apiKeyId === activeKeyId);

    expect(active).toMatchObject({
      inputTokens: 350,
      outputTokens: 35,
      totalTokens: 385,
      requests: 3,
      credits: 3.75,
      unpricedRequests: 1,
      lastUsedAt: new Date('2026-03-20T12:00:00.000Z'),
    });
  });

  it('lists every key of the organization, sorted by total tokens then name', async () => {
    const items = await query(orgId);

    expect(items.map((item) => item.apiKeyId)).toEqual([
      activeKeyId,
      revokedKeyId,
      recreatedKeyId,
      oldUsageKeyId,
    ]);
    expect(items).not.toContainEqual(
      expect.objectContaining({ apiKeyId: otherOrgKeyId }),
    );
  });

  it('keeps usage of revoked keys and does not move it to a recreated key', async () => {
    const items = await query(orgId);
    const revoked = items.find((item) => item.apiKeyId === revokedKeyId);
    const recreated = items.find((item) => item.apiKeyId === recreatedKeyId);

    expect(revoked).toMatchObject({
      name: 'Citizen portal',
      revokedAt: new Date('2026-03-15T00:00:00.000Z'),
      totalTokens: 110,
      requests: 1,
      credits: null,
      unpricedRequests: 1,
    });
    expect(recreated).toMatchObject({
      name: 'Citizen portal',
      revokedAt: null,
      totalTokens: 0,
      requests: 0,
      credits: 0,
      lastUsedAt: null,
    });
  });

  it('reports keys whose usage lies outside the range with zero usage', async () => {
    const items = await query(orgId);
    const oldUsage = items.find((item) => item.apiKeyId === oldUsageKeyId);

    expect(oldUsage).toMatchObject({ requests: 0, totalTokens: 0 });

    const allTime = await query(orgId, false);
    expect(
      allTime.find((item) => item.apiKeyId === oldUsageKeyId),
    ).toMatchObject({ requests: 1, totalTokens: 60 });
  });

  it('scopes results to the requested organization', async () => {
    const items = await query(otherOrgId);

    expect(items.map((item) => item.apiKeyId)).toEqual([otherOrgKeyId]);
    expect(items[0]).toMatchObject({ requests: 1, totalTokens: 1000 });
  });
});

async function seed(dataSource: DataSource): Promise<void> {
  await dataSource.getRepository(ApiKeyRecord).insert([
    { id: activeKeyId, name: 'Council portal', orgId },
    {
      id: revokedKeyId,
      name: 'Citizen portal',
      orgId,
      revokedAt: new Date('2026-03-15T00:00:00.000Z'),
    },
    { id: recreatedKeyId, name: 'Citizen portal', orgId },
    { id: oldUsageKeyId, name: 'Pilot', orgId },
    { id: otherOrgKeyId, name: 'Other org key', orgId: otherOrgId },
  ]);

  await dataSource.getRepository(UsageRecord).insert([
    usage({ apiKeyId: activeKeyId, at: startDate, tokens: [100, 10] }, 1.5),
    usage(
      {
        apiKeyId: activeKeyId,
        at: '2026-03-10T08:00:00.000Z',
        tokens: [200, 20],
      },
      2.25,
    ),
    usage(
      {
        apiKeyId: activeKeyId,
        at: '2026-03-20T12:00:00.000Z',
        tokens: [50, 5],
      },
      null,
    ),
    usage({ apiKeyId: activeKeyId, at: endDate, tokens: [999, 999] }, 9),
    usage(
      {
        apiKeyId: revokedKeyId,
        at: '2026-03-05T00:00:00.000Z',
        tokens: [100, 10],
      },
      null,
    ),
    usage(
      {
        apiKeyId: oldUsageKeyId,
        at: '2026-02-01T00:00:00.000Z',
        tokens: [50, 10],
      },
      0.5,
    ),
    usage(
      {
        userId: randomUUID(),
        at: '2026-03-10T00:00:00.000Z',
        tokens: [5000, 5000],
      },
      50,
    ),
    usage(
      {
        apiKeyId: otherOrgKeyId,
        organizationId: otherOrgId,
        at: '2026-03-10T00:00:00.000Z',
        tokens: [900, 100],
      },
      10,
    ),
  ]);
}

function usage(
  params: {
    apiKeyId?: UUID;
    userId?: UUID;
    organizationId?: UUID;
    at: Date | string;
    tokens: [number, number];
  },
  creditsConsumed: number | null,
): Partial<UsageRecord> {
  const [inputTokens, outputTokens] = params.tokens;
  return {
    id: randomUUID(),
    createdAt: new Date(params.at),
    userId: params.userId ?? null,
    apiKeyId: params.apiKeyId ?? null,
    organizationId: params.organizationId ?? orgId,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    creditsConsumed,
  };
}
