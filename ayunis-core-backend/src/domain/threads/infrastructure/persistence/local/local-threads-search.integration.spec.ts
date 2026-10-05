import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { MessageRecord } from 'src/domain/messages/infrastructure/persistence/local/schema/message.record';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { LocalThreadsRepository } from './local-threads.repository';
import { ThreadRecord } from './schema/thread.record';
import { ThreadMapper } from './mappers/thread.mapper';
import type { LocalThreadAssignmentsRepository } from './local-thread-assignments.repository';

const threadSchema = new EntitySchema<ThreadRecord>({
  name: 'ThreadRecord',
  target: ThreadRecord,
  tableName: 'threads',
  columns: {
    id: { type: 'uuid', primary: true },
    userId: { type: 'uuid' },
    title: { type: String },
    workspaceId: { type: 'uuid', nullable: true },
    createdAt: { type: 'timestamp' },
  },
});
const messageSchema = new EntitySchema<MessageRecord>({
  name: 'MessageRecord',
  target: MessageRecord,
  tableName: 'messages',
  columns: {
    id: { type: 'uuid', primary: true },
    threadId: { type: 'uuid' },
    role: { type: String },
    content: { type: 'jsonb' },
  },
});

describe('Chat title and content search (PostgreSQL)', () => {
  let db: DataSource;
  let repository: LocalThreadsRepository;
  let schema: string;
  const ownerId = randomUUID();
  const otherId = randomUUID();

  beforeAll(async () => {
    schema = `ayc298_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [threadSchema, messageSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    repository = new LocalThreadsRepository(
      db.getRepository(ThreadRecord),
      new ThreadMapper(undefined!, undefined!, undefined!, undefined!),
      {} as LocalThreadAssignmentsRepository,
      {
        tx: undefined,
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  });

  beforeEach(async () => {
    await db.getRepository(MessageRecord).clear();
    await db.getRepository(ThreadRecord).clear();
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  });

  async function thread(
    title = 'Budget discussion',
    userId = ownerId,
    workspaceId?: ReturnType<typeof randomUUID>,
  ) {
    const record = {
      id: randomUUID(),
      userId,
      title,
      workspaceId,
      createdAt: new Date(),
    };
    await db.getRepository(ThreadRecord).insert(record);
    return record.id;
  }

  async function message(
    threadId: ReturnType<typeof randomUUID>,
    role = MessageRole.USER,
    content: MessageRecord['content'] = [
      { type: MessageContentType.TEXT, text: 'Beschaffung für das Rathaus' },
    ],
  ) {
    const id = randomUUID();
    await db.getRepository(MessageRecord).save({ id, threadId, role, content });
    return id;
  }

  async function search(
    text = 'beschaffung',
    userId = ownerId,
    workspaceId?: ReturnType<typeof randomUUID>,
  ) {
    return repository.findAll(userId, undefined, { search: text, workspaceId });
  }

  it.each([MessageRole.USER, MessageRole.ASSISTANT])(
    'finds case-insensitive text in %s messages',
    async (role) => {
      const id = await thread();
      await message(id, role);
      expect((await search()).data.map((item) => item.id)).toEqual([id]);
    },
  );

  it('keeps title matches and excludes another principal’s title and content', async () => {
    const id = await thread('Beschaffung');
    const otherThread = await thread('Beschaffung', otherId);
    await message(otherThread);
    expect((await search()).data.map((item) => item.id)).toEqual([id]);
    expect(
      (await search('beschaffung', otherId)).data.map((item) => item.id),
    ).toEqual([otherThread]);
  });

  it('counts and paginates threads once despite multiple matching messages and blocks', async () => {
    const id = await thread();
    await message(id);
    await message(id, MessageRole.ASSISTANT, [
      { type: MessageContentType.TEXT, text: 'Beschaffung' },
      { type: MessageContentType.TEXT, text: 'Beschaffung erneut' },
    ]);
    await message(await thread());
    const result = await repository.findAll(
      ownerId,
      undefined,
      { search: 'beschaffung' },
      { limit: 1, offset: 1 },
    );
    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(1);
  });

  it('intersects content matches with the workspace filter', async () => {
    const workspaceId = randomUUID();
    const id = await thread('Budget', ownerId, workspaceId);
    await message(id);
    await message(await thread());
    expect(
      (await search('beschaffung', ownerId, workspaceId)).data.map(
        (item) => item.id,
      ),
    ).toEqual([id]);
  });

  it('preserves unfiltered and empty-search listing', async () => {
    const id = await thread();
    expect((await search('')).data.map((item) => item.id)).toEqual([id]);
    expect((await repository.findAll(ownerId)).total).toBe(1);
    expect((await search('unmatched')).total).toBe(0);
  });

  it('excludes system, tool, thinking, image and skill instruction content', async () => {
    const id = await thread();
    await message(id, MessageRole.SYSTEM);
    await message(id, MessageRole.TOOL, [
      {
        type: MessageContentType.TOOL_RESULT,
        toolId: 'result',
        toolName: 'search',
        result: 'Beschaffung',
      },
    ]);
    await message(id, MessageRole.ASSISTANT, [
      { type: MessageContentType.THINKING, thinking: 'Beschaffung' },
      {
        type: MessageContentType.IMAGE,
        index: 0,
        contentType: 'image/png',
        altText: 'Beschaffung',
      },
      {
        type: MessageContentType.TEXT,
        text: 'Beschaffung',
        isSkillInstruction: true,
      },
    ]);
    expect((await search()).total).toBe(0);
  });

  it('reflects message removal and recreation without stale matches', async () => {
    const id = await thread();
    const messageId = await message(id);
    expect((await search()).total).toBe(1);
    await db.getRepository(MessageRecord).delete(messageId);
    expect((await search()).total).toBe(0);
    await message(id);
    expect((await search()).total).toBe(1);
  });

  it('treats SQL-like search input as a bound value', async () => {
    await thread();
    expect((await search("' OR 1=1 --")).total).toBe(0);
  });
});
