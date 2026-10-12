import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import type { StaleThreadSourceRef } from 'src/domain/threads/application/ports/threads.repository';
import { LocalThreadAssignmentsRepository } from './local-thread-assignments.repository';
import { ThreadRecord } from './schema/thread.record';
import { ThreadSourceAssignmentRecord } from './schema/thread-source-assignment.record';
import { ThreadKnowledgeBaseAssignmentRecord } from './schema/thread-knowledge-base-assignment.record';
import type { ThreadSourceAssignmentMapper } from './mappers/thread-source-assignment.mapper';

const userSchema = new EntitySchema({
  name: 'UserRecord',
  tableName: 'users',
  columns: {
    id: { type: 'uuid', primary: true },
    orgId: { type: 'uuid' },
  },
});

const threadSchema = new EntitySchema<ThreadRecord>({
  name: 'ThreadRecord',
  target: ThreadRecord,
  tableName: 'threads',
  columns: {
    id: { type: 'uuid', primary: true },
    userId: { type: 'uuid' },
  },
});

const messageSchema = new EntitySchema({
  name: 'MessageRecord',
  tableName: 'messages',
  columns: {
    id: { type: 'uuid', primary: true },
    threadId: { type: 'uuid' },
    createdAt: { type: 'timestamp' },
  },
});

const sourceAssignmentSchema = new EntitySchema<ThreadSourceAssignmentRecord>({
  name: 'ThreadSourceAssignmentRecord',
  target: ThreadSourceAssignmentRecord,
  tableName: 'thread_source_assignments',
  columns: {
    id: { type: 'uuid', primary: true },
    threadId: { type: 'uuid' },
    sourceId: { type: 'uuid' },
    originSkillId: { type: 'uuid', nullable: true },
  },
});

const kbAssignmentSchema =
  new EntitySchema<ThreadKnowledgeBaseAssignmentRecord>({
    name: 'ThreadKnowledgeBaseAssignmentRecord',
    target: ThreadKnowledgeBaseAssignmentRecord,
    tableName: 'thread_knowledge_base_assignments',
    columns: {
      id: { type: 'uuid', primary: true },
      threadId: { type: 'uuid' },
      knowledgeBaseId: { type: 'uuid' },
    },
  });

const DAY_MS = 24 * 60 * 60 * 1000;

function sortRefs(refs: StaleThreadSourceRef[]): StaleThreadSourceRef[] {
  return [...refs].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

describe('Stale direct thread source candidates', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalThreadAssignmentsRepository;

  beforeAll(async () => {
    schemaName = `stale_sources_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [
        userSchema,
        threadSchema,
        messageSchema,
        sourceAssignmentSchema,
        kbAssignmentSchema,
      ],
      migrations: [],
      migrationsRun: false,
      // The candidate query is raw SQL with unqualified table names, so every
      // pooled connection must resolve them inside the throwaway schema.
      extra: { options: `-c search_path=${schemaName}` },
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    repository = new LocalThreadAssignmentsRepository(
      dataSource.getRepository(ThreadRecord),
      dataSource.getRepository(ThreadSourceAssignmentRecord),
      dataSource.getRepository(ThreadKnowledgeBaseAssignmentRecord),
      {} as ThreadSourceAssignmentMapper,
      createTransactionHost(dataSource),
    );
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  async function createThread(orgId: UUID, messageAges: number[]) {
    const userId = randomUUID();
    const threadId = randomUUID();
    await dataSource.getRepository('UserRecord').insert({ id: userId, orgId });
    await dataSource.getRepository(ThreadRecord).insert({
      id: threadId,
      userId,
    });
    for (const ageDays of messageAges) {
      await dataSource.getRepository('MessageRecord').insert({
        id: randomUUID(),
        threadId,
        createdAt: new Date(Date.now() - ageDays * DAY_MS),
      });
    }
    return threadId;
  }

  async function assign(
    threadId: UUID,
    sourceId: UUID,
    originSkillId: UUID | null = null,
  ): Promise<void> {
    await dataSource.getRepository(ThreadSourceAssignmentRecord).insert({
      id: randomUUID(),
      threadId,
      sourceId,
      originSkillId,
    });
  }

  it('returns only sources whose direct assignments all sit on stale threads', async () => {
    const orgA = randomUUID();
    const orgB = randomUUID();
    const cutoff = new Date(Date.now() - 30 * DAY_MS);
    const staleThread = await createThread(orgA, [45, 40]);
    const activeThread = await createThread(orgA, [40, 1]);
    const emptyThread = await createThread(orgA, []);
    const otherStaleThread = await createThread(orgA, [35]);
    const orgBStaleThread = await createThread(orgB, [60]);
    const skillId = randomUUID();

    const onlyStale = randomUUID();
    await assign(staleThread, onlyStale);
    const staleAndActive = randomUUID();
    await assign(staleThread, staleAndActive);
    await assign(activeThread, staleAndActive);
    const onEmptyThread = randomUUID();
    await assign(emptyThread, onEmptyThread);
    const staleWithSkillCopy = randomUUID();
    await assign(otherStaleThread, staleWithSkillCopy);
    await assign(activeThread, staleWithSkillCopy, skillId);
    const skillOnly = randomUUID();
    await assign(otherStaleThread, skillOnly, skillId);
    const orgBStale = randomUUID();
    await assign(orgBStaleThread, orgBStale);

    const candidates =
      await repository.findSourcesWithOnlyStaleDirectAssignments(cutoff);

    expect(sortRefs(candidates)).toEqual(
      sortRefs([
        { sourceId: onlyStale, orgId: orgA },
        { sourceId: staleWithSkillCopy, orgId: orgA },
        { sourceId: orgBStale, orgId: orgB },
      ]),
    );
  });
});

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
