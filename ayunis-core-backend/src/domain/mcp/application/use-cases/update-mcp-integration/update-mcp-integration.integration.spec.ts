import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import type { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationFactory } from 'src/domain/mcp/application/factories/mcp-integration.factory';
import { McpIntegrationAuthFactory } from 'src/domain/mcp/application/factories/mcp-integration-auth.factory';
import type { McpCredentialEncryptionPort } from 'src/domain/mcp/application/ports/mcp-credential-encryption.port';
import { McpConfigService } from 'src/domain/mcp/application/services/mcp-config.service';
import type { ConnectionValidationService } from 'src/domain/mcp/application/services/connection-validation.service';
import { McpCapabilityCacheService } from 'src/domain/mcp/application/services/mcp-capability-cache.service';
import type { McpOAuthClientConfigurationService } from 'src/domain/mcp/application/services/mcp-oauth-client-configuration.service';
import type { McpClientService } from 'src/domain/mcp/application/services/mcp-client.service';
import { aCustomMcpIntegration } from 'src/domain/mcp/application/testing/mcp-integration.fixtures';
import type { ConfigField } from 'src/domain/mcp/domain/value-objects/integration-config-schema';
import { McpIntegrationUserConfig } from 'src/domain/mcp/domain/mcp-integration-user-config.entity';
import { McpIntegrationMapper } from 'src/domain/mcp/infrastructure/persistence/postgres/mappers/mcp-integration.mapper';
import { McpIntegrationsRepository } from 'src/domain/mcp/infrastructure/persistence/postgres/mcp-integrations.repository';
import { McpIntegrationUserConfigRepository } from 'src/domain/mcp/infrastructure/persistence/postgres/mcp-integration-user-config.repository';
import {
  CustomMcpIntegrationRecord,
  McpIntegrationAuthRecord,
  McpIntegrationRecord,
  McpIntegrationUserConfigRecord,
  NoAuthMcpIntegrationAuthRecord,
} from 'src/domain/mcp/infrastructure/persistence/postgres/schema';
import { McpIntegrationKind } from 'src/domain/mcp/domain/value-objects/mcp-integration-kind.enum';
import { McpAuthMethod } from 'src/domain/mcp/domain/value-objects/mcp-auth-method.enum';
import { UpdateMcpIntegrationCommand } from './update-mcp-integration.command';
import { UpdateMcpIntegrationUseCase } from './update-mcp-integration.use-case';

const baseColumns = {
  id: { type: 'uuid', primary: true },
  createdAt: { type: 'timestamp', createDate: true },
  updatedAt: { type: 'timestamp', updateDate: true },
} as const;

const integrationSchema = new EntitySchema<McpIntegrationRecord>({
  name: 'McpIntegrationRecord',
  target: McpIntegrationRecord,
  tableName: 'mcp_integrations',
  inheritance: {
    pattern: 'STI',
    column: { name: 'integration_type', type: 'varchar' },
  },
  columns: {
    ...baseColumns,
    orgId: { type: 'uuid' },
    name: { type: String },
    serverUrl: { type: String },
    enabled: { type: Boolean, default: true },
    connectionStatus: { type: String, default: 'pending' },
    lastConnectionError: { type: 'text', nullable: true },
    lastConnectionCheck: { type: 'timestamp', nullable: true },
    returnsPii: { type: Boolean, default: true },
    description: { type: 'text', nullable: true },
    configSchema: { name: 'config_schema', type: 'jsonb', nullable: true },
    orgConfigValues: {
      name: 'org_config_values',
      type: 'jsonb',
      nullable: true,
      default: {},
    },
  },
  relations: {
    auth: {
      type: 'one-to-one',
      target: 'McpIntegrationAuthRecord',
      inverseSide: 'integration',
      eager: true,
    },
  },
});

const customIntegrationSchema = new EntitySchema<CustomMcpIntegrationRecord>({
  name: 'CustomMcpIntegrationRecord',
  target: CustomMcpIntegrationRecord,
  type: 'entity-child',
  discriminatorValue: McpIntegrationKind.CUSTOM,
  columns: {},
});

const authSchema = new EntitySchema<McpIntegrationAuthRecord>({
  name: 'McpIntegrationAuthRecord',
  target: McpIntegrationAuthRecord,
  tableName: 'mcp_integration_auth_methods',
  inheritance: {
    pattern: 'STI',
    column: { name: 'auth_type', type: 'varchar' },
  },
  columns: { ...baseColumns, integrationId: { type: 'uuid' } },
  relations: {
    integration: {
      type: 'one-to-one',
      target: 'McpIntegrationRecord',
      inverseSide: 'auth',
      joinColumn: { name: 'integrationId' },
      onDelete: 'CASCADE',
    },
  },
});

const noAuthSchema = new EntitySchema<NoAuthMcpIntegrationAuthRecord>({
  name: 'NoAuthMcpIntegrationAuthRecord',
  target: NoAuthMcpIntegrationAuthRecord,
  type: 'entity-child',
  discriminatorValue: McpAuthMethod.NO_AUTH,
  columns: {},
});

const userConfigSchema = new EntitySchema<McpIntegrationUserConfigRecord>({
  name: 'McpIntegrationUserConfigRecord',
  target: McpIntegrationUserConfigRecord,
  tableName: 'mcp_integration_user_configs',
  columns: {
    ...baseColumns,
    integrationId: { name: 'integration_id', type: 'varchar' },
    userId: { name: 'user_id', type: 'varchar' },
    configValues: { name: 'config_values', type: 'jsonb', default: {} },
  },
});

const tokenField: ConfigField = {
  key: 'personalToken',
  label: 'Personal token',
  type: 'secret',
  headerName: 'X-Personal-Token',
  required: true,
};

const regionField: ConfigField = {
  key: 'region',
  label: 'Region',
  type: 'text',
  headerName: 'X-Region',
  required: false,
};

describe('UpdateMcpIntegrationUseCase transaction', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let useCase: UpdateMcpIntegrationUseCase;
  let integrations: McpIntegrationsRepository;
  let userConfigs: McpIntegrationUserConfigRepository;
  let invalidateConnections: jest.Mock;

  const orgId = randomUUID();
  const userId = randomUUID();
  let integrationId: UUID;

  beforeAll(async () => {
    schemaName = `ayc_1450_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      logging: false,
      entities: [
        integrationSchema,
        customIntegrationSchema,
        authSchema,
        noAuthSchema,
        userConfigSchema,
      ],
      migrations: [],
      migrationsRun: false,
    });
    await dataSource.initialize();
    const runner = dataSource.createQueryRunner();
    await runner.createSchema(schemaName, true);
    await runner.release();
    await dataSource.synchronize();
    await dataSource.query(`
      CREATE FUNCTION "${schemaName}".fail_user_config_cleanup()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'user config cleanup failed';
      END;
      $$
    `);
    configureUseCase();
  }, 30_000);

  beforeEach(async () => {
    invalidateConnections.mockClear();
    const integration = await integrations.save(
      aCustomMcpIntegration({
        orgId,
        configSchema: {
          authType: 'CUSTOM',
          orgFields: [],
          userFields: [tokenField, regionField],
        },
      }),
    );
    integrationId = integration.id;
    await userConfigs.save(
      new McpIntegrationUserConfig({
        integrationId,
        userId,
        configValues: { personalToken: 'encrypted-token', region: 'eu' },
      }),
    );
  }, 30_000);

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    const runner = dataSource.createQueryRunner();
    await runner.dropSchema(schemaName, true, true);
    await runner.release();
    await dataSource.destroy();
  }, 30_000);

  it('keeps the previous schema and user values when the credential cleanup fails', async () => {
    await dataSource.query(`
      CREATE TRIGGER fail_user_config_cleanup
      BEFORE UPDATE ON "${schemaName}"."mcp_integration_user_configs"
      FOR EACH ROW EXECUTE FUNCTION "${schemaName}".fail_user_config_cleanup()
    `);
    try {
      await expect(
        useCase.execute(updateUserFields([regionField])),
      ).rejects.toThrow();
    } finally {
      await dataSource.query(
        `DROP TRIGGER fail_user_config_cleanup ON "${schemaName}"."mcp_integration_user_configs"`,
      );
    }

    expect(await storedUserFieldKeys()).toEqual(['personalToken', 'region']);
    expect(await storedUserValues()).toEqual({
      personalToken: 'encrypted-token',
      region: 'eu',
    });
    expect(invalidateConnections).not.toHaveBeenCalled();
  });

  it('requires a fresh credential after a removed field is added back', async () => {
    await useCase.execute(updateUserFields([regionField]));

    expect(await storedUserFieldKeys()).toEqual(['region']);
    expect(await storedUserValues()).toEqual({ region: 'eu' });

    await useCase.execute(updateUserFields([tokenField, regionField]));

    expect(await storedUserFieldKeys()).toEqual(['personalToken', 'region']);
    expect(await storedUserValues()).toEqual({ region: 'eu' });
    expect(invalidateConnections).toHaveBeenCalledTimes(2);
  });

  function configureUseCase(): void {
    const txHost = createTransactionHost(dataSource);
    integrations = new McpIntegrationsRepository(
      dataSource.getRepository(McpIntegrationRecord),
      dataSource.getRepository(McpIntegrationAuthRecord),
      unusedRepository(),
      unusedRepository(),
      new McpIntegrationMapper(
        new McpIntegrationFactory(),
        new McpIntegrationAuthFactory(),
      ),
      txHost,
    );
    userConfigs = new McpIntegrationUserConfigRepository(txHost);
    invalidateConnections = jest.fn();
    const encryption = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    } as unknown as McpCredentialEncryptionPort;
    useCase = new UpdateMcpIntegrationUseCase(
      integrations,
      userConfigs,
      { get: jest.fn().mockReturnValue(orgId) } as unknown as ContextService,
      encryption,
      new McpConfigService(encryption),
      {
        validateAndUpdateStatus: jest.fn((integration: unknown) =>
          Promise.resolve(integration),
        ),
      } as unknown as ConnectionValidationService,
      new McpCapabilityCacheService(),
      {} as McpOAuthClientConfigurationService,
      { invalidateConnections } as unknown as McpClientService,
      txHost,
    );
  }

  function updateUserFields(userFields: ConfigField[]) {
    return new UpdateMcpIntegrationCommand({
      integrationId,
      configSchema: { authType: 'CUSTOM', orgFields: [], userFields },
    });
  }

  async function storedUserFieldKeys(): Promise<string[]> {
    const record = await dataSource
      .getRepository(McpIntegrationRecord)
      .findOneByOrFail({ id: integrationId });
    return (record.configSchema?.userFields ?? []).map((field) => field.key);
  }

  async function storedUserValues(): Promise<Record<string, string>> {
    const record = await dataSource
      .getRepository(McpIntegrationUserConfigRecord)
      .findOneByOrFail({ integrationId, userId });
    return record.configValues;
  }
});

function unusedRepository<T>(): T {
  return {} as T;
}

function createTransactionHost(
  dataSource: DataSource,
): TransactionHost<TransactionalAdapterTypeOrm> {
  const adapter = new TransactionalAdapterTypeOrm({
    dataSourceToken: DataSource,
  });
  return new TransactionHost<TransactionalAdapterTypeOrm>({
    ...adapter.optionsFactory(dataSource),
    connectionName: undefined,
    enableTransactionProxy: false,
    defaultTxOptions: {},
    extraProviderTokens: [],
  });
}
