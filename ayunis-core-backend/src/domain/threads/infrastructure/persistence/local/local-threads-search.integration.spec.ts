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
import { ThreadType } from 'src/domain/threads/domain/thread-type.enum';

const threadSchema = new EntitySchema<ThreadRecord>({
  name: 'ThreadRecord',
  target: ThreadRecord,
  tableName: 'threads',
  columns: {
    id: { type: 'uuid', primary: true },
    userId: { type: 'uuid' },
    title: { type: String },
    workspaceId: { type: 'uuid', nullable: true },
    type: { type: String, default: ThreadType.CHAT },
    routineId: { type: 'uuid', nullable: true },
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
      // The workspace membership condition names workspace_members unqualified.
      extra: { options: `-c search_path=${schema}` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    await db.query(
      `CREATE TABLE workspace_members ("workspaceId" uuid, "userId" uuid)`,
    );
    repository = new LocalThreadsRepository(
      db.getRepository(ThreadRecord),
      new ThreadMapper(undefined!, undefined!, undefined!, undefined!),
      {} as LocalThreadAssignmentsRepository,
      {
        tx: undefined,
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  }, 30_000);

  beforeEach(async () => {
    await db.getRepository(MessageRecord).clear();
    await db.getRepository(ThreadRecord).clear();
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  async function thread(
    title = 'Budget discussion',
    userId = ownerId,
    workspaceId?: ReturnType<typeof randomUUID>,
    type = ThreadType.CHAT,
  ) {
    const record = {
      id: randomUUID(),
      userId,
      title,
      workspaceId,
      type,
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
    await db.query(
      `INSERT INTO workspace_members ("workspaceId", "userId") VALUES ($1, $2)`,
      [workspaceId, ownerId],
    );
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

  it('does not match the reminders sent to a routine run', async () => {
    const id = await thread(
      'Amtsblatt',
      ownerId,
      undefined,
      ThreadType.ROUTINE,
    );
    await message(id, MessageRole.USER, [
      { type: MessageContentType.TEXT, text: 'Beschaffung', isNudge: true },
    ]);
    expect((await search()).total).toBe(0);
  });

  it('lists only chats when routine threads are filtered out', async () => {
    const chat = await thread('Budget');
    const routineThread = await thread(
      'Amtsblatt – 07.11.2026',
      ownerId,
      undefined,
      ThreadType.ROUTINE,
    );
    const all = await repository.findAll(ownerId);
    const chatsOnly = await repository.findAll(ownerId, undefined, {
      type: ThreadType.CHAT,
    });
    expect(all.data.map((item) => item.id)).toEqual(
      expect.arrayContaining([chat, routineThread]),
    );
    expect(all.total).toBe(2);
    expect(chatsOnly.data.map((item) => item.id)).toEqual([chat]);
    expect(chatsOnly.total).toBe(1);
  });

  it("lists only the owner's threads of one routine, newest first, when filtered by it", async () => {
    const routineId = randomUUID();
    async function routineThread(
      createdAt: string,
      userId = ownerId,
      ofRoutine: ReturnType<typeof randomUUID> | null = routineId,
    ) {
      const record = {
        id: randomUUID(),
        userId,
        title: `Amtsblatt – ${createdAt}`,
        type: ThreadType.ROUTINE,
        routineId: ofRoutine,
        createdAt: new Date(createdAt),
      };
      await db.getRepository(ThreadRecord).insert(record);
      return record.id;
    }
    const older = await routineThread('2026-11-05T06:00:00.000Z');
    const newer = await routineThread('2026-11-07T06:00:00.000Z');
    await routineThread('2026-11-07T06:00:00.000Z', ownerId, randomUUID());
    await routineThread('2026-11-07T06:00:00.000Z', otherId);
    await thread('Budget');

    const page = await repository.findAll(ownerId, undefined, { routineId });

    expect(page.data.map((item) => item.id)).toEqual([newer, older]);
    expect(page.total).toBe(2);
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
