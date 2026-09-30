import { randomUUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { LocalThreadAssignmentsRepository } from './local-thread-assignments.repository';
import { ThreadRecord } from './schema/thread.record';
import { ThreadKnowledgeBaseAssignmentRecord } from './schema/thread-knowledge-base-assignment.record';
import { ThreadSourceAssignmentRecord } from './schema/thread-source-assignment.record';
import type { ThreadSourceAssignmentMapper } from './mappers/thread-source-assignment.mapper';

const threadSchema = new EntitySchema<ThreadRecord>({
  name: 'ThreadRecord',
  target: ThreadRecord,
  tableName: 'threads',
  columns: { id: { type: 'uuid', primary: true }, userId: { type: 'uuid' } },
});
const assignmentSchema = new EntitySchema<ThreadKnowledgeBaseAssignmentRecord>({
  name: 'ThreadKnowledgeBaseAssignmentRecord',
  target: ThreadKnowledgeBaseAssignmentRecord,
  tableName: 'assignments',
  columns: {
    id: { type: 'uuid', primary: true },
    threadId: { type: 'uuid' },
    knowledgeBaseId: { type: 'uuid' },
    originSkillId: { type: 'uuid', nullable: true },
  },
});
const sourceAssignmentSchema = new EntitySchema<ThreadSourceAssignmentRecord>({
  name: 'ThreadSourceAssignmentRecord',
  target: ThreadSourceAssignmentRecord,
  tableName: 'source_assignments',
  columns: { id: { type: 'uuid', primary: true } },
});

describe('Thread assignment transaction', () => {
  let db: DataSource;
  let schema: string;
  let txHost: TransactionHost<TransactionalAdapterTypeOrm>;
  let repository: LocalThreadAssignmentsRepository;
  const ownerId = randomUUID();
  let threadId: ReturnType<typeof randomUUID>;
  let knowledgeBaseId: ReturnType<typeof randomUUID>;

  beforeAll(async () => {
    schema = `ayc496_threads_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [threadSchema, assignmentSchema, sourceAssignmentSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    configureRepository();
  });

  function configureRepository(): void {
    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    txHost = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(db),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    repository = new LocalThreadAssignmentsRepository(
      db.getRepository(ThreadRecord),
      db.getRepository(ThreadSourceAssignmentRecord),
      db.getRepository(ThreadKnowledgeBaseAssignmentRecord),
      {} as ThreadSourceAssignmentMapper,
      txHost,
    );
  }

  beforeEach(async () => {
    threadId = randomUUID();
    knowledgeBaseId = randomUUID();
    await db
      .getRepository(ThreadRecord)
      .insert({ id: threadId, userId: ownerId });
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });

  async function assignmentCount(): Promise<number> {
    return db
      .getRepository(ThreadKnowledgeBaseAssignmentRecord)
      .countBy({ threadId });
  }

  it('rolls back an assignment when the enclosing operation fails', async () => {
    await expect(
      txHost.withTransaction(async () => {
        await repository.addKnowledgeBaseAssignment({
          threadId,
          userId: ownerId,
          knowledgeBaseId,
        });
        throw new Error('attachment failed');
      }),
    ).rejects.toThrow('attachment failed');
    expect(await assignmentCount()).toBe(0);
  });

  it('reads a thread created earlier in the same transaction', async () => {
    const newThreadId = randomUUID();
    await txHost.withTransaction(async () => {
      await txHost.tx
        .getRepository(ThreadRecord)
        .insert({ id: newThreadId, userId: ownerId });
      await repository.addKnowledgeBaseAssignment({
        threadId: newThreadId,
        userId: ownerId,
        knowledgeBaseId,
      });
    });
    expect(
      await db
        .getRepository(ThreadKnowledgeBaseAssignmentRecord)
        .countBy({ threadId: newThreadId }),
    ).toBe(1);
  });

  it('denies an independent user before allowing the owner to attach', async () => {
    await expect(
      repository.addKnowledgeBaseAssignment({
        threadId,
        userId: randomUUID(),
        knowledgeBaseId,
      }),
    ).rejects.toBeInstanceOf(ThreadNotFoundError);
    expect(await assignmentCount()).toBe(0);
    await txHost.withTransaction(() =>
      repository.addKnowledgeBaseAssignment({
        threadId,
        userId: ownerId,
        knowledgeBaseId,
      }),
    );
    expect(await assignmentCount()).toBe(1);
  });

  it('restores removed assignments on failure and supports committed recreation', async () => {
    const params = { threadId, userId: ownerId, knowledgeBaseId };
    await repository.addKnowledgeBaseAssignment(params);
    await expect(
      txHost.withTransaction(async () => {
        await repository.removeKnowledgeBaseAssignment(params);
        throw new Error('removal failed');
      }),
    ).rejects.toThrow('removal failed');
    expect(await assignmentCount()).toBe(1);
    await txHost.withTransaction(() =>
      repository.removeKnowledgeBaseAssignment(params),
    );
    expect(await assignmentCount()).toBe(0);
    await txHost.withTransaction(() =>
      repository.addKnowledgeBaseAssignment(params),
    );
    expect(await assignmentCount()).toBe(1);
  });
});
