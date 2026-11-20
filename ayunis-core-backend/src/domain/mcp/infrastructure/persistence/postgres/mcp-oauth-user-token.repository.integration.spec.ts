import { ListAvailableMcpIntegrationsUseCase } from 'src/domain/mcp/application/use-cases/list-available-mcp-integrations/list-available-mcp-integrations.use-case';
import { aCustomMcpIntegration } from 'src/domain/mcp/application/testing/mcp-integration.fixtures';
import { mcpConnectionRevision } from 'src/domain/mcp/application/services/mcp-connection-revision';
import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { McpOAuthUserToken } from 'src/domain/mcp/domain/mcp-oauth-user-token.entity';
import { McpOAuthUserTokenRecord } from './schema/mcp-oauth-user-token.record';
import { McpOAuthUserTokenRepository } from './mcp-oauth-user-token.repository';

const entity = new EntitySchema<McpOAuthUserTokenRecord>({
  name: 'McpOAuthUserTokenRecord',
  target: McpOAuthUserTokenRecord,
  tableName: 'mcp_oauth_user_tokens',
  columns: {
    id: { type: 'varchar', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    integrationId: { type: 'varchar', name: 'integration_id' },
    userId: { type: 'varchar', name: 'user_id' },
    grantRevision: { type: 'uuid', name: 'grant_revision' },
    issuer: { type: 'text' },
    encryptedAccessToken: { type: 'text', name: 'encrypted_access_token' },
    encryptedRefreshToken: { type: 'text', nullable: true },
    expiresAt: { type: 'timestamptz', nullable: true },
    tokenType: { type: 'text', nullable: true },
    scopes: { type: 'text', array: true },
  },
  uniques: [{ columns: ['integrationId', 'userId'] }],
});

describe('OAuth runtime refresh compare-and-save (PostgreSQL)', () => {
  let db: DataSource;
  let repository: McpOAuthUserTokenRepository;
  const schema = `mcp_token_${randomUUID().replaceAll('-', '')}`;
  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [entity],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    repository = new McpOAuthUserTokenRepository(
      db.getRepository(McpOAuthUserTokenRecord),
    );
  }, 30_000);
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });

  it('refuses old or other-user refreshes after reconnect and never recreates a disconnected grant', async () => {
    const original = new McpOAuthUserToken({
      integrationId: randomUUID(),
      userId: randomUUID(),
      issuer: 'https://auth.example.com',
      encryptedAccessToken: 'encrypted:old',
    });
    await repository.save(original);
    const replacement = new McpOAuthUserToken({
      ...original,
      grantRevision: randomUUID(),
      encryptedAccessToken: 'encrypted:reconnected',
    });
    await repository.save(replacement);
    expect(
      await repository.saveIfCurrent(original, original.grantRevision),
    ).toBe(false);
    expect(
      await repository.findByIntegrationAndUser(
        original.integrationId,
        original.userId,
      ),
    ).toMatchObject({
      grantRevision: replacement.grantRevision,
      encryptedAccessToken: 'encrypted:reconnected',
    });
    const refreshed = new McpOAuthUserToken({
      ...replacement,
      encryptedAccessToken: 'encrypted:refreshed',
    });
    expect(
      await repository.saveIfCurrent(refreshed, replacement.grantRevision),
    ).toBe(true);
    expect(
      await repository.findByIntegrationAndUser(
        original.integrationId,
        original.userId,
      ),
    ).toMatchObject({
      grantRevision: replacement.grantRevision,
      encryptedAccessToken: 'encrypted:refreshed',
    });
    const otherUser = new McpOAuthUserToken({
      ...refreshed,
      userId: randomUUID(),
    });
    expect(
      await repository.saveIfCurrent(otherUser, replacement.grantRevision),
    ).toBe(false);
    await repository.delete(original.integrationId, original.userId);
    expect(
      await repository.saveIfCurrent(refreshed, replacement.grantRevision),
    ).toBe(false);
    expect(
      await repository.findByIntegrationAndUser(
        original.integrationId,
        original.userId,
      ),
    ).toBeNull();
  });
  it('lists personal OAuth grants in one query while excluding other users and integrations', async () => {
    const userId = randomUUID();
    const otherUserId = randomUUID();
    const orgId = randomUUID();
    const integrations = [0, 1].map(() =>
      aCustomMcpIntegration({
        orgId,
        configSchema: {
          authType: 'OAUTH',
          orgFields: [],
          userFields: [],
          oauth: { clientRegistration: 'automatic' },
        },
      }),
    );
    const tokens = integrations.map(
      (integration) =>
        new McpOAuthUserToken({
          integrationId: integration.id,
          userId,
          issuer: 'https://auth.example.com',
          encryptedAccessToken: 'encrypted:own',
        }),
    );
    for (const token of tokens)
      await repository.save(
        new McpOAuthUserToken({
          ...token,
          id: randomUUID(),
          userId: otherUserId,
        }),
      );
    await repository.save(
      new McpOAuthUserToken({
        ...tokens[0],
        id: randomUUID(),
        integrationId: randomUUID(),
      }),
    );
    const useCase = new ListAvailableMcpIntegrationsUseCase(
      { findAll: jest.fn().mockResolvedValue(integrations) } as never,
      { findByIntegrationIdsAndUser: jest.fn().mockResolvedValue([]) } as never,
      { get: (key: string) => (key === 'orgId' ? orgId : userId) } as never,
      {
        findForUser: jest.fn().mockResolvedValue([
          {
            integrationId: integrations[0].id,
            userId,
            revision: mcpConnectionRevision(integrations[0], null, tokens[0]),
            failure: 'forbidden',
            checkedAt: new Date(),
          },
        ]),
      } as never,
      repository,
    );
    expect(
      (await useCase.execute()).map((value) => value.userAuthorized),
    ).toEqual([false, false]);
    for (const token of tokens) await repository.save(token);
    const selected = await repository.findByIntegrationIdsAndUser(
      integrations.map((value) => value.id),
      userId,
    );
    expect(
      selected.map((token) => token.id).sort((a, b) => a.localeCompare(b)),
    ).toEqual(
      tokens.map((token) => token.id).sort((a, b) => a.localeCompare(b)),
    );
    const queries = jest.spyOn(db.logger, 'logQuery');
    try {
      const result = await useCase.execute();
      expect(result.map((value) => value.userAuthorized)).toEqual([true, true]);
      expect(result[0].userConnectionFailure).toBe('forbidden');
      expect(result[1].userConnectionFailure).toBeUndefined();
      const selects = queries.mock.calls.filter(
        ([sql]) =>
          sql.startsWith('SELECT') && sql.includes('mcp_oauth_user_tokens'),
      );
      expect(selects).toHaveLength(1);
    } finally {
      queries.mockRestore();
    }
  });
  it('does not query or return grants for an empty integration selection', async () => {
    const queries = jest.spyOn(db.logger, 'logQuery');
    try {
      await expect(
        repository.findByIntegrationIdsAndUser([], randomUUID()),
      ).resolves.toEqual([]);
      expect(queries).not.toHaveBeenCalled();
    } finally {
      queries.mockRestore();
    }
  });
});
