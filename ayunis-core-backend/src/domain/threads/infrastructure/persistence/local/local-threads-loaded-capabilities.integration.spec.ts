import { randomUUID, type UUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import type { LocalThreadAssignmentsRepository } from './local-thread-assignments.repository';
import { LocalThreadsRepository } from './local-threads.repository';
import type { ThreadMapper } from './mappers/thread.mapper';
import { ThreadRecord } from './schema/thread.record';

// ts-jest drops the column types of the records, so the columns the update
// touches are declared explicitly.
const threadSchema = new EntitySchema<ThreadRecord>({
  name: 'ThreadRecord',
  target: ThreadRecord,
  tableName: 'threads',
  columns: {
    id: { type: 'varchar', primary: true },
    userId: { type: 'varchar' },
    workspaceId: { type: 'varchar', nullable: true },
    loadedCapabilityIds: {
      name: 'loaded_capability_ids',
      type: 'text',
      array: true,
      default: () => "'{}'",
    },
  },
});

describe('Loaded capability ids of a thread (PostgreSQL)', () => {
  let db: DataSource;
  let schema: string;
  let threads: LocalThreadsRepository;
  let owner: UUID;
  let threadId: UUID;

  beforeAll(async () => {
    schema = `ayc2021_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [threadSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
      // The membership condition names workspace_members unqualified.
      extra: { options: `-c search_path=${schema}` },
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    await db.query(`CREATE TABLE workspace_members (
      id varchar PRIMARY KEY, "workspaceId" varchar NOT NULL,
      "userId" varchar NOT NULL
    )`);
    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    const txHost = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(db),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    threads = new LocalThreadsRepository(
      db.getRepository(ThreadRecord),
      {} as ThreadMapper,
      {} as LocalThreadAssignmentsRepository,
      txHost,
    );
  }, 30_000);

  beforeEach(async () => {
    owner = randomUUID();
    threadId = randomUUID();
    await db
      .getRepository(ThreadRecord)
      .insert({ id: threadId, userId: owner, workspaceId: null });
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  }, 30_000);

  const load = (capabilityIds: string[], userId: UUID = owner) =>
    threads.addLoadedCapabilityIds({ threadId, userId, capabilityIds });

  async function storedIds(): Promise<string[]> {
    const record = await db
      .getRepository(ThreadRecord)
      .findOneByOrFail({ id: threadId });
    return record.loadedCapabilityIds;
  }

  it('starts a thread with no loaded capabilities', async () => {
    expect(await storedIds()).toEqual([]);
  });

  it('keeps the ids already loaded and adds only new ones, each once', async () => {
    await load(['routine_management']);

    await load([
      'artifacts',
      'routine_management',
      'artifacts',
      'chat_history',
    ]);

    expect(await storedIds()).toEqual([
      'routine_management',
      'artifacts',
      'chat_history',
    ]);
  });

  it('keeps every id when several loads of the same thread run at once', async () => {
    await Promise.all(
      ['artifacts', 'chat_history', 'code_execution', 'routine_management'].map(
        (id) => load([id]),
      ),
    );

    expect((await storedIds()).sort((a, b) => a.localeCompare(b))).toEqual([
      'artifacts',
      'chat_history',
      'code_execution',
      'routine_management',
    ]);
  });

  it('refuses another user and leaves the thread unchanged', async () => {
    await load(['artifacts']);

    await expect(
      load(['skill_management'], randomUUID()),
    ).rejects.toBeInstanceOf(ThreadNotFoundError);
    expect(await storedIds()).toEqual(['artifacts']);
  });
});
