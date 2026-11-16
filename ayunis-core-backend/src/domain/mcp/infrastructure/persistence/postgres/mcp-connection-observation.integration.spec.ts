import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { McpConnectionObservationRecord } from './schema/mcp-connection-observation.record';
import { McpConnectionObservationRepository } from './mcp-connection-observation.repository';

const entity = new EntitySchema<McpConnectionObservationRecord>({
  name: 'McpConnectionObservationRecord',
  target: McpConnectionObservationRecord,
  tableName: 'mcp_connection_observations',
  columns: {
    id: { type: 'varchar', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    integrationId: { type: 'varchar', name: 'integration_id' },
    userId: { type: 'varchar', name: 'user_id' },
    revision: { type: 'varchar' },
    startedAt: { type: 'timestamp' },
    checkedAt: { type: 'timestamp' },
    failure: { type: 'varchar', nullable: true },
  },
  uniques: [{ columns: ['integrationId', 'userId'] }],
});

describe('MCP connection observations (PostgreSQL)', () => {
  let db: DataSource;
  let repository: McpConnectionObservationRepository;
  const schema = `mcp_health_${randomUUID().replaceAll('-', '')}`;
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
    repository = new McpConnectionObservationRepository(
      db.getRepository(McpConnectionObservationRecord),
    );
  }, 30_000);
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });

  it('keeps a newer observation when an older failure completes late and isolates another user', async () => {
    const integrationId = randomUUID();
    const userId = randomUUID();
    const otherUser = randomUUID();
    const newest = {
      integrationId,
      userId,
      revision: 'new-credentials',
      startedAt: new Date(2000),
      checkedAt: new Date(),
      failure: null,
    };
    await repository.record(newest);
    await repository.record({
      ...newest,
      revision: 'old-credentials',
      startedAt: new Date(1000),
      failure: 'rejected',
    });
    await repository.record({
      ...newest,
      userId: otherUser,
      failure: 'forbidden',
    });
    expect(await repository.findForUser([integrationId], userId)).toMatchObject(
      [{ revision: 'new-credentials', failure: null }],
    );
    expect(
      await repository.findForUser([integrationId], otherUser),
    ).toMatchObject([{ failure: 'forbidden' }]);
  });

  it('replaces a failure with a later successful retry for the same credentials', async () => {
    const integrationId = randomUUID();
    const userId = randomUUID();
    const failed = {
      integrationId,
      userId,
      revision: 'same-credentials',
      startedAt: new Date(1000),
      checkedAt: new Date(),
      failure: 'timeout' as const,
    };
    await repository.record(failed);
    await repository.record({
      ...failed,
      startedAt: new Date(2000),
      failure: null,
    });
    expect(await repository.findForUser([integrationId], userId)).toMatchObject(
      [{ failure: null }],
    );
  });
});
