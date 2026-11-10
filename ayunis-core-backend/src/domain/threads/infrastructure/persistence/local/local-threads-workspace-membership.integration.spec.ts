import { randomUUID, type UUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { MessageRecord } from 'src/domain/messages/infrastructure/persistence/local/schema/message.record';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import type { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import { LocalThreadAssignmentsRepository } from './local-thread-assignments.repository';
import { LocalThreadsRepository } from './local-threads.repository';
import type { ThreadMapper } from './mappers/thread.mapper';
import type { ThreadSourceAssignmentMapper } from './mappers/thread-source-assignment.mapper';
import { ThreadKnowledgeBaseAssignmentRecord } from './schema/thread-knowledge-base-assignment.record';
import { ThreadRecord } from './schema/thread.record';
import { ThreadSourceAssignmentRecord } from './schema/thread-source-assignment.record';

// ts-jest drops the column types of the records, so the tables the queries
// touch are declared explicitly. Ids are varchar, as in the real schema.
const id = { type: 'varchar', primary: true } as const;
const threadSchema = new EntitySchema<ThreadRecord>({
  name: 'ThreadRecord',
  target: ThreadRecord,
  tableName: 'threads',
  columns: {
    id,
    userId: { type: 'varchar' },
    title: { type: 'varchar', nullable: true },
    workspaceId: { type: 'varchar', nullable: true },
    modelId: { type: 'varchar', nullable: true },
    type: { type: 'varchar', default: 'chat' },
    routineId: { type: 'varchar', nullable: true },
    createdAt: { type: 'timestamp', createDate: true },
  },
  relations: {
    messages: {
      type: 'one-to-many',
      target: 'MessageRecord',
      inverseSide: 'thread',
    },
    model: {
      type: 'many-to-one',
      target: 'PermittedModelRecord',
      joinColumn: { name: 'modelId' },
    },
    knowledgeBaseAssignments: {
      type: 'one-to-many',
      target: 'ThreadKnowledgeBaseAssignmentRecord',
      inverseSide: 'thread',
    },
    mcpIntegrations: {
      type: 'many-to-many',
      target: 'McpIntegrationRecord',
      joinTable: { name: 'thread_mcp_integrations' },
    },
  },
});
const messageSchema = new EntitySchema<MessageRecord>({
  name: 'MessageRecord',
  target: MessageRecord,
  tableName: 'messages',
  columns: { id, threadId: { type: 'varchar' } },
  relations: {
    thread: {
      type: 'many-to-one',
      target: 'ThreadRecord',
      joinColumn: { name: 'threadId' },
      inverseSide: 'messages',
    },
  },
});
const knowledgeBaseAssignmentSchema =
  new EntitySchema<ThreadKnowledgeBaseAssignmentRecord>({
    name: 'ThreadKnowledgeBaseAssignmentRecord',
    target: ThreadKnowledgeBaseAssignmentRecord,
    tableName: 'thread_knowledge_base_assignments',
    columns: {
      id,
      threadId: { type: 'varchar' },
      knowledgeBaseId: { type: 'varchar' },
      originSkillId: { type: 'varchar', nullable: true },
    },
    relations: {
      thread: {
        type: 'many-to-one',
        target: 'ThreadRecord',
        joinColumn: { name: 'threadId' },
        inverseSide: 'knowledgeBaseAssignments',
      },
      knowledgeBase: {
        type: 'many-to-one',
        target: 'KnowledgeBaseRecord',
        joinColumn: { name: 'knowledgeBaseId' },
        createForeignKeyConstraints: false,
      },
    },
  });
const sourceAssignmentSchema = new EntitySchema<ThreadSourceAssignmentRecord>({
  name: 'ThreadSourceAssignmentRecord',
  target: ThreadSourceAssignmentRecord,
  tableName: 'thread_source_assignments',
  columns: {
    id,
    threadId: { type: 'varchar' },
    sourceId: { type: 'varchar' },
    originSkillId: { type: 'varchar', nullable: true },
  },
});
const stubSchemas = [
  'PermittedModelRecord',
  'KnowledgeBaseRecord',
  'McpIntegrationRecord',
].map((name) => new EntitySchema({ name, columns: { id } }));

/**
 * Distinct principals: the creator and a colleague are both members of the
 * workspace and each has a chat in it; the creator also has a personal chat.
 * Membership rows are changed directly, as no member API exists here.
 */
describe('Workspace chats require current membership (PostgreSQL)', () => {
  let db: DataSource;
  let schema: string;
  let txHost: TransactionHost<TransactionalAdapterTypeOrm>;
  let threads: LocalThreadsRepository;
  let assignments: LocalThreadAssignmentsRepository;
  let creator: UUID;
  let colleague: UUID;
  let workspaceId: UUID;
  let otherWorkspaceId: UUID;
  let workspaceChat: UUID;
  let personalChat: UUID;
  let colleagueChat: UUID;

  beforeAll(async () => {
    schema = `ayc1698_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [
        threadSchema,
        messageSchema,
        knowledgeBaseAssignmentSchema,
        sourceAssignmentSchema,
        ...stubSchemas,
      ],
      migrations: [],
      migrationsRun: false,
      logging: false,
      // The membership condition names workspace_members unqualified, so every
      // pooled connection must resolve it inside the throwaway schema.
      extra: { options: `-c search_path=${schema}` },
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    await db.query(`CREATE TABLE workspace_members (
      id varchar PRIMARY KEY, "workspaceId" varchar NOT NULL,
      "userId" varchar NOT NULL, role varchar NOT NULL,
      UNIQUE ("workspaceId", "userId")
    )`);
    configureRepositories();
  }, 30_000);

  function configureRepositories(): void {
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
    assignments = new LocalThreadAssignmentsRepository(
      db.getRepository(ThreadRecord),
      db.getRepository(ThreadSourceAssignmentRecord),
      db.getRepository(ThreadKnowledgeBaseAssignmentRecord),
      {
        toRecord: (assignment: SourceAssignment, threadId: UUID) => ({
          id: assignment.id,
          threadId,
          sourceId: assignment.source.id,
          originSkillId: null,
        }),
      } as unknown as ThreadSourceAssignmentMapper,
      txHost,
    );
    threads = new LocalThreadsRepository(
      db.getRepository(ThreadRecord),
      { toDomain: (record: ThreadRecord) => record } as unknown as ThreadMapper,
      {
        findSourceAssignmentsByThreadId: () => Promise.resolve([]),
      } as unknown as LocalThreadAssignmentsRepository,
      txHost,
    );
  }

  beforeEach(async () => {
    creator = randomUUID();
    colleague = randomUUID();
    workspaceId = randomUUID();
    otherWorkspaceId = randomUUID();
    await join(creator, workspaceId);
    await join(colleague, workspaceId);
    await join(creator, otherWorkspaceId);
    workspaceChat = await chat(creator, workspaceId);
    personalChat = await chat(creator, null);
    colleagueChat = await chat(colleague, workspaceId);
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  }, 30_000);

  async function join(userId: UUID, workspace: UUID): Promise<void> {
    await db.query(
      `INSERT INTO workspace_members (id, "workspaceId", "userId", role)
       VALUES ($1, $2, $3, 'user')`,
      [randomUUID(), workspace, userId],
    );
  }

  async function leave(userId: UUID, workspace: UUID): Promise<void> {
    await db.query(
      `DELETE FROM workspace_members WHERE "workspaceId" = $1 AND "userId" = $2`,
      [workspace, userId],
    );
  }

  async function chat(userId: UUID, workspace: UUID | null): Promise<UUID> {
    const chatId = randomUUID();
    await db.getRepository(ThreadRecord).insert({
      id: chatId,
      userId,
      title: 'Haushalt 2027',
      workspaceId: workspace,
    });
    return chatId;
  }

  async function listedIds(userId: UUID, workspace?: UUID): Promise<UUID[]> {
    const page = await threads.findAll(
      userId,
      undefined,
      workspace ? { workspaceId: workspace } : undefined,
    );
    return page.data.map((thread) => thread.id);
  }

  /** Every read the creator can make of one chat, by path. */
  async function reads(chatId: UUID) {
    return {
      list: (await listedIds(creator)).includes(chatId),
      workspaceList: (await listedIds(creator, workspaceId)).includes(chatId),
      detail: (await threads.findOne(chatId, creator)) !== null,
      images: await threads.existsForUser(chatId, creator),
      aiContext: (await threads.findContextRefs(chatId, creator)) !== null,
      citations: (await threads.findCitationContext(chatId, creator)) !== null,
      byIds: (await threads.findAllByIds(creator, [chatId])).length === 1,
    };
  }

  const reachable = {
    list: true,
    workspaceList: true,
    detail: true,
    images: true,
    aiContext: true,
    citations: true,
    byIds: true,
  };
  const unreachable = Object.fromEntries(
    Object.keys(reachable).map((path) => [path, false]),
  );

  /**
   * Every write the creator can make to one chat, by path. Moving the chat out
   * of its workspace comes last, so the other writes still hit a workspace
   * chat.
   */
  function writes(chatId: UUID) {
    const ref = { threadId: chatId, userId: creator };
    const knowledgeBase = { ...ref, knowledgeBaseId: randomUUID() };
    return {
      rename: () => threads.updateTitle({ ...ref, title: 'Haushalt 2028' }),
      addKnowledgeBase: () =>
        assignments.addKnowledgeBaseAssignment(knowledgeBase),
      removeKnowledgeBase: () =>
        assignments.removeKnowledgeBaseAssignment(knowledgeBase),
      mcpIntegrations: () =>
        assignments.updateMcpIntegrations({ ...ref, mcpIntegrationIds: [] }),
      addSource: () =>
        assignments.addSourceAssignment({
          ...ref,
          sourceAssignment: {
            id: randomUUID(),
            source: { id: randomUUID() },
          } as SourceAssignment,
        }),
      uploadSources: () =>
        txHost.withTransaction(() =>
          assignments.attachSourcesWithinCapacity({
            ...ref,
            sourceIds: [randomUUID()],
            maxSources: 10,
          }),
        ),
      move: () => threads.assignToWorkspace({ ...ref, workspaceId: null }),
    };
  }

  async function writeOutcomes(chatId: UUID): Promise<Record<string, string>> {
    const outcomes: Record<string, string> = {};
    for (const [path, write] of Object.entries(writes(chatId))) {
      outcomes[path] = await write().then(
        () => 'written',
        (error: unknown) =>
          error instanceof ThreadNotFoundError ? 'not found' : String(error),
      );
    }
    return outcomes;
  }

  function everyWrite(outcome: string): Record<string, string> {
    return Object.fromEntries(
      Object.keys(writes(randomUUID())).map((path) => [path, outcome]),
    );
  }

  async function storedChat(chatId: UUID) {
    return db.getRepository(ThreadRecord).findOneBy({ id: chatId });
  }

  it('lets the creator read and continue their workspace chat while a member', async () => {
    expect(await reads(workspaceChat)).toEqual(reachable);
    expect(await writeOutcomes(workspaceChat)).toEqual(everyWrite('written'));
  });

  it('hides the chat on every path once the creator is no longer a member, and keeps it', async () => {
    await leave(creator, workspaceId);

    expect(await reads(workspaceChat)).toEqual(unreachable);
    expect(await writeOutcomes(workspaceChat)).toEqual(everyWrite('not found'));
    expect(await storedChat(workspaceChat)).toMatchObject({
      workspaceId,
      title: 'Haushalt 2027',
    });
    expect(
      await db
        .getRepository(ThreadKnowledgeBaseAssignmentRecord)
        .countBy({ threadId: workspaceChat }),
    ).toBe(0);
    expect(
      await db
        .getRepository(ThreadSourceAssignmentRecord)
        .countBy({ threadId: workspaceChat }),
    ).toBe(0);
  });

  it('still lets retention delete the chat after the creator left', async () => {
    await leave(creator, workspaceId);

    await threads.delete(workspaceChat, creator);

    expect(await storedChat(workspaceChat)).toBeNull();
  });

  it('makes the chat reachable again when the creator is added back', async () => {
    await leave(creator, workspaceId);
    expect(await reads(workspaceChat)).toEqual(unreachable);

    await join(creator, workspaceId);

    expect(await reads(workspaceChat)).toEqual(reachable);
    expect(await writeOutcomes(workspaceChat)).toEqual(everyWrite('written'));
  });

  it('never shows another member the creator’s chats in their workspace', async () => {
    expect(await listedIds(colleague, workspaceId)).toEqual([colleagueChat]);
    expect(await threads.findOne(workspaceChat, colleague)).toBeNull();
    expect(await threads.findAllByIds(colleague, [workspaceChat])).toEqual([]);
    await expect(
      threads.updateTitle({
        threadId: workspaceChat,
        userId: colleague,
        title: 'Taken over',
      }),
    ).rejects.toBeInstanceOf(ThreadNotFoundError);
  });

  it('leaves personal chats reachable without any workspace membership', async () => {
    await leave(creator, workspaceId);
    await leave(creator, otherWorkspaceId);

    expect(await listedIds(creator)).toEqual([personalChat]);
    expect(await reads(personalChat)).toEqual({
      ...reachable,
      workspaceList: false,
    });
    expect(await writeOutcomes(personalChat)).toEqual(everyWrite('written'));
  });
});
