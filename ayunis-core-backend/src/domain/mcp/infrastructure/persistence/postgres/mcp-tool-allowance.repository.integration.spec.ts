import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { McpToolAllowance } from 'src/domain/mcp/domain/mcp-tool-allowance.entity';
import { McpToolAllowanceRepository } from './mcp-tool-allowance.repository';
import { McpToolAllowanceRecord } from './schema/mcp-tool-allowance.record';

// The table without its foreign keys, so the test needs no users, orgs or
// integrations.
const allowanceSchema = new EntitySchema<McpToolAllowanceRecord>({
  name: 'McpToolAllowanceRecord',
  target: McpToolAllowanceRecord,
  tableName: 'mcp_tool_allowances',
  columns: {
    id: { type: 'varchar', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    userId: { name: 'user_id', type: 'varchar' },
    integrationId: { name: 'integration_id', type: 'varchar' },
    toolName: { name: 'tool_name', type: 'varchar' },
  },
  uniques: [{ columns: ['userId', 'integrationId', 'toolName'] }],
});

describe('McpToolAllowanceRepository (PostgreSQL)', () => {
  let db: DataSource;
  let repository: McpToolAllowanceRepository;
  let schema: string;
  const owner = randomUUID();
  const otherUser = randomUUID();
  const integration = randomUUID();
  const otherIntegration = randomUUID();

  beforeAll(async () => {
    schema = `mcp_tool_allowances_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [allowanceSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    repository = new McpToolAllowanceRepository({
      tx: db.manager,
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>);
  }, 30_000);

  beforeEach(async () => {
    await db.getRepository(McpToolAllowanceRecord).clear();
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  async function allow(
    userId: UUID,
    integrationId: UUID,
    toolName: string,
  ): Promise<McpToolAllowance> {
    const allowance = new McpToolAllowance({ userId, integrationId, toolName });
    await repository.saveIfAbsent(allowance);
    return allowance;
  }

  it("does not list another user's allowances", async () => {
    await allow(owner, integration, 'search_meetings');
    await allow(otherUser, integration, 'create_booking');

    const listed = await repository.findByUser(otherUser);

    expect(listed.map((allowance) => allowance.toolName)).toEqual([
      'create_booking',
    ]);
  });

  it("does not let another user remove an allowance and keeps the owner's entry", async () => {
    const allowance = await allow(owner, integration, 'search_meetings');

    const deleted = await repository.deleteByIdAndUser(allowance.id, otherUser);

    expect(deleted).toBe(false);
    expect(await repository.findByUser(owner)).toHaveLength(1);
  });

  it('removes only the given allowance', async () => {
    const removed = await allow(owner, integration, 'search_meetings');
    await allow(owner, integration, 'create_booking');

    const deleted = await repository.deleteByIdAndUser(removed.id, owner);

    expect(deleted).toBe(true);
    expect(
      (await repository.findByUser(owner)).map((allowance) => allowance.id),
    ).not.toContain(removed.id);
    expect(await repository.findByUser(owner)).toHaveLength(1);
  });

  it('keeps one entry when the same tool is allowed twice, even at once', async () => {
    await Promise.all([
      allow(owner, integration, 'search_meetings'),
      allow(owner, integration, 'search_meetings'),
    ]);
    await allow(owner, integration, 'search_meetings');

    expect(await repository.findByUser(owner)).toHaveLength(1);
  });

  it('allows a removed tool again', async () => {
    const first = await allow(owner, integration, 'search_meetings');
    await repository.deleteByIdAndUser(first.id, owner);

    await allow(owner, integration, 'search_meetings');

    expect(await repository.findByUser(owner)).toHaveLength(1);
  });

  it("finds only the user's allowances of the requested integrations", async () => {
    await allow(owner, integration, 'search_meetings');
    await allow(owner, otherIntegration, 'create_booking');
    await allow(otherUser, integration, 'delete_booking');

    const found = await repository.findByUserAndIntegrationIds(owner, [
      integration,
    ]);

    expect(found.map((allowance) => allowance.toolName)).toEqual([
      'search_meetings',
    ]);
  });
});
