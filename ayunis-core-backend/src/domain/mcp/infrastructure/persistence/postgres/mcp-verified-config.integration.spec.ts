import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DataSource, EntitySchema, type EntityManager } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { aCustomMcpIntegration } from 'src/domain/mcp/application/testing/mcp-integration.fixtures';
import type { CustomMcpIntegration } from 'src/domain/mcp/domain/integrations/custom-mcp-integration.entity';
import { McpIntegrationUserConfig } from 'src/domain/mcp/domain/mcp-integration-user-config.entity';
import { McpIntegrationRecord } from './schema/mcp-integration.record';
import { McpIntegrationUserConfigRecord } from './schema/mcp-integration-user-config.record';
import { McpIntegrationUserConfigRepository } from './mcp-integration-user-config.repository';

const base = {
  id: { type: 'uuid', primary: true },
  createdAt: { type: 'timestamp', createDate: true },
  updatedAt: { type: 'timestamp', updateDate: true },
} as const;
const integrationSchema = new EntitySchema<McpIntegrationRecord>({
  name: 'McpIntegrationRecord',
  target: McpIntegrationRecord,
  tableName: 'mcp_integrations',
  columns: {
    ...base,
    orgId: { type: 'uuid' },
    name: { type: String },
    serverUrl: { type: String },
    enabled: { type: Boolean },
    configSchema: { type: 'jsonb' },
    orgConfigValues: { type: 'jsonb', nullable: true },
  },
});
const userSchema = new EntitySchema<McpIntegrationUserConfigRecord>({
  name: 'McpIntegrationUserConfigRecord',
  target: McpIntegrationUserConfigRecord,
  tableName: 'mcp_integration_user_configs',
  columns: {
    ...base,
    integrationId: { name: 'integration_id', type: 'varchar' },
    userId: { name: 'user_id', type: 'varchar' },
    configValues: { name: 'config_values', type: 'jsonb' },
  },
  uniques: [{ columns: ['integrationId', 'userId'] }],
});

describe('Verified MCP credential writes (PostgreSQL)', () => {
  let db: DataSource;
  let repository: McpIntegrationUserConfigRepository;
  let integration: CustomMcpIntegration;
  let schema: string;
  const userId = randomUUID();
  const otherUserId = randomUUID();

  beforeAll(async () => {
    schema = `mcp_verified_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [integrationSchema, userSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    const storage = new AsyncLocalStorage<EntityManager>();
    repository = new McpIntegrationUserConfigRepository({
      get tx() {
        return storage.getStore() ?? db.manager;
      },
      withTransaction: (fn: () => Promise<unknown>) =>
        db.transaction((manager) => storage.run(manager, fn)),
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>);
  }, 30_000);

  beforeEach(async () => {
    integration = aCustomMcpIntegration();
    await db.getRepository(McpIntegrationRecord).insert({
      id: integration.id,
      orgId: integration.orgId,
      name: integration.name,
      serverUrl: integration.serverUrl,
      enabled: integration.enabled,
      configSchema: integration.configSchema,
      orgConfigValues: integration.orgConfigValues,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    });
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  });

  function candidate(token: string, owner = userId) {
    return new McpIntegrationUserConfig({
      integrationId: integration.id,
      userId: owner,
      configValues: { token },
    });
  }

  it('allows only one concurrent first save for the same user and integration', async () => {
    const outcomes = await Promise.all([
      repository.saveVerified(candidate('encrypted:first'), integration, null),
      repository.saveVerified(candidate('encrypted:second'), integration, null),
    ]);
    expect(outcomes.sort()).toEqual([false, true]);
    expect(
      await db
        .getRepository(McpIntegrationUserConfigRecord)
        .count({ where: { integrationId: integration.id } }),
    ).toBe(1);
  });

  it('preserves another user while rejecting a stale replacement', async () => {
    await repository.save(candidate('encrypted:original'));
    await repository.save(candidate('encrypted:other-user', otherUserId));
    const snapshot = await repository.findByIntegrationAndUser(
      integration.id,
      userId,
    );
    const newer = new McpIntegrationUserConfig({
      ...snapshot!,
      configValues: { token: 'encrypted:newer' },
    });
    await repository.save(newer);
    expect(
      await repository.saveVerified(
        candidate('encrypted:stale'),
        integration,
        snapshot,
      ),
    ).toBe(false);
    expect(
      (await repository.findByIntegrationAndUser(integration.id, userId))
        ?.configValues,
    ).toEqual({ token: 'encrypted:newer' });
    expect(
      (await repository.findByIntegrationAndUser(integration.id, otherUserId))
        ?.configValues,
    ).toEqual({ token: 'encrypted:other-user' });
  });

  it('accepts unchanged legacy OAuth schema and null org values after domain normalization', async () => {
    const rawSchema = {
      authType: 'OAUTH',
      orgFields: [],
      userFields: [
        {
          key: 'token',
          label: 'Token',
          type: 'secret' as const,
          required: true,
        },
      ],
      oauth: { clientRegistration: 'automatic' as const },
    };
    integration = aCustomMcpIntegration({
      id: integration.id,
      orgId: integration.orgId,
      serverUrl: integration.serverUrl,
      updatedAt: integration.updatedAt,
      configSchema: rawSchema,
      orgConfigValues: {},
    });
    await db.query(
      `UPDATE "${schema}"."mcp_integrations" SET "configSchema" = $1::jsonb, "orgConfigValues" = NULL WHERE id = $2`,
      [JSON.stringify(rawSchema), integration.id],
    );
    expect(
      await repository.saveVerified(
        candidate('encrypted:valid'),
        integration,
        null,
      ),
    ).toBe(true);
  });

  it('rejects a verified token if the target URL changed before the write', async () => {
    await db
      .getRepository(McpIntegrationRecord)
      .update(integration.id, { serverUrl: 'https://different.example/mcp' });
    expect(
      await repository.saveVerified(
        candidate('encrypted:candidate'),
        integration,
        null,
      ),
    ).toBe(false);
    expect(
      await repository.findByIntegrationAndUser(integration.id, userId),
    ).toBeNull();
  });

  it('does not recreate a deleted credential record from a stale verified snapshot', async () => {
    await repository.save(candidate('encrypted:original'));
    const snapshot = await repository.findByIntegrationAndUser(
      integration.id,
      userId,
    );
    await repository.deleteByIntegrationId(integration.id);
    expect(
      await repository.saveVerified(
        candidate('encrypted:stale'),
        integration,
        snapshot,
      ),
    ).toBe(false);
    expect(
      await repository.findByIntegrationAndUser(integration.id, userId),
    ).toBeNull();
  });
});
