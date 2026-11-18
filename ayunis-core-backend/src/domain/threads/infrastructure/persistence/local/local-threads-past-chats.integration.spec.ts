import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { MessageRecord } from 'src/domain/messages/infrastructure/persistence/local/schema/message.record';
import {
  PastChatScope,
  type PastChatActivityRange,
} from 'src/domain/threads/domain/past-chat-scope';
import { ThreadType } from 'src/domain/threads/domain/thread-type.enum';
import type { LocalThreadAssignmentsRepository } from './local-thread-assignments.repository';
import { LocalThreadsRepository } from './local-threads.repository';
import type { ThreadMapper } from './mappers/thread.mapper';
import { ThreadRecord } from './schema/thread.record';

// ts-jest drops the column types of the records, so the tables the queries
// touch are declared explicitly.
const threadSchema = new EntitySchema<ThreadRecord>({
  name: 'ThreadRecord',
  target: ThreadRecord,
  tableName: 'threads',
  columns: {
    id: { type: 'uuid', primary: true },
    userId: { type: 'uuid' },
    title: { type: String, nullable: true },
    workspaceId: { type: 'uuid', nullable: true },
    isAnonymous: { type: Boolean, default: false },
    type: { type: String, default: ThreadType.CHAT },
    createdAt: { type: 'timestamp' },
    lastActivityAt: { type: 'timestamp', nullable: true },
  },
  relations: {
    messages: {
      type: 'one-to-many',
      target: 'MessageRecord',
      inverseSide: 'thread',
    },
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
    createdAt: { type: 'timestamp' },
  },
  relations: {
    thread: {
      type: 'many-to-one',
      target: 'ThreadRecord',
      joinColumn: { name: 'threadId' },
      inverseSide: 'messages',
    },
  },
});

const at = (iso: string) => new Date(`${iso}Z`);

/**
 * Distinct principals: the owner and a colleague each have chats; the owner
 * is a member of two workspaces. Membership rows are written directly, as no
 * member API exists at this layer.
 */
describe('Past chats a run may look back on (PostgreSQL)', () => {
  let db: DataSource;
  let schema: string;
  let repository: LocalThreadsRepository;
  const owner = randomUUID();
  const colleague = randomUUID();
  const workspace = randomUUID();
  const otherWorkspace = randomUUID();
  const currentChat = randomUUID();
  const everywhere = new PastChatScope(currentChat, null);
  const inWorkspace = new PastChatScope(currentChat, workspace);

  beforeAll(async () => {
    schema = `ayc1820_${randomUUID().replaceAll('-', '')}`;
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
      { toDomain: (record: ThreadRecord) => record } as unknown as ThreadMapper,
      {} as LocalThreadAssignmentsRepository,
      {
        tx: undefined,
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  }, 30_000);

  beforeEach(async () => {
    await db.query('DELETE FROM messages');
    await db.query('DELETE FROM threads');
    await db.query('DELETE FROM workspace_members');
    await join(owner, workspace);
    await join(owner, otherWorkspace);
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  async function join(userId: UUID, workspaceId: UUID) {
    await db.query(
      `INSERT INTO workspace_members ("workspaceId", "userId") VALUES ($1, $2)`,
      [workspaceId, userId],
    );
  }

  async function leave(userId: UUID, workspaceId: UUID) {
    await db.query(
      `DELETE FROM workspace_members WHERE "workspaceId" = $1 AND "userId" = $2`,
      [workspaceId, userId],
    );
  }

  async function chat(
    fields: {
      id?: UUID;
      userId?: UUID;
      workspaceId?: UUID;
      isAnonymous?: boolean;
      type?: ThreadType;
      createdAt?: string;
      /** Null for a chat from before activity was recorded. */
      lastActivity?: string | null;
    } = {},
  ): Promise<UUID> {
    const { lastActivity = '2026-11-01T10:00:00', ...rest } = fields;
    const id = rest.id ?? randomUUID();
    await db.getRepository(ThreadRecord).insert({
      id,
      userId: rest.userId ?? owner,
      title: 'Hundesteuer',
      workspaceId: rest.workspaceId ?? null,
      isAnonymous: rest.isAnonymous ?? false,
      type: rest.type ?? ThreadType.CHAT,
      createdAt: at(rest.createdAt ?? '2026-10-01T08:00:00'),
      lastActivityAt: lastActivity === null ? () => 'NULL' : at(lastActivity),
    });
    return id;
  }

  async function message(
    threadId: UUID,
    createdAt: string,
    role = MessageRole.USER,
  ): Promise<UUID> {
    const id = randomUUID();
    await db.getRepository(MessageRecord).insert({
      id,
      threadId,
      role,
      content: [{ type: MessageContentType.TEXT, text: 'Wie hoch ist sie?' }],
      createdAt: at(createdAt),
    });
    return id;
  }

  async function listed(
    scope: PastChatScope = everywhere,
    userId: UUID = owner,
    activity: PastChatActivityRange = {},
  ): Promise<UUID[]> {
    const page = await repository.findPastChats({
      userId,
      scope,
      activity,
      pagination: { limit: 50, offset: 0 },
    });
    return page.data.map((thread) => thread.id);
  }

  const readable = async (
    threadId: UUID,
    scope: PastChatScope = everywhere,
    userId: UUID = owner,
  ) => (await repository.findPastChat({ userId, scope, threadId })) !== null;

  it('offers only the user’s own chats, never anonymous or routine ones or the current chat', async () => {
    const own = await chat();
    const excluded = [
      await chat({ id: currentChat }),
      await chat({ isAnonymous: true }),
      await chat({ type: ThreadType.ROUTINE }),
    ];
    const colleagues = await chat({ userId: colleague });

    expect(await listed()).toEqual([own]);
    expect(await listed(everywhere, colleague)).toEqual([colleagues]);
    for (const id of [...excluded, colleagues]) {
      expect(await readable(id)).toBe(false);
    }
    expect(await readable(own)).toBe(true);
  });

  it('offers a workspace chat only that workspace’s chats, any other chat all of them', async () => {
    const personal = await chat({ lastActivity: '2026-11-03T10:00:00' });
    const here = await chat({
      workspaceId: workspace,
      lastActivity: '2026-11-02T10:00:00',
    });
    const there = await chat({ workspaceId: otherWorkspace });
    await chat({ userId: colleague, workspaceId: workspace });

    expect(await listed(inWorkspace)).toEqual([here]);
    expect(await listed(everywhere)).toEqual([personal, here, there]);
    expect(await readable(personal, inWorkspace)).toBe(false);
    expect(await readable(there, inWorkspace)).toBe(false);
    expect(await readable(here, inWorkspace)).toBe(true);
  });

  it('hides a workspace’s chats once the user leaves it and shows them again when re-added', async () => {
    const personal = await chat({ lastActivity: '2026-11-03T10:00:00' });
    const here = await chat({ workspaceId: workspace });
    expect(await listed()).toEqual([personal, here]);

    await leave(owner, workspace);

    expect(await listed()).toEqual([personal]);
    expect(await listed(inWorkspace)).toEqual([]);
    expect(await readable(here)).toBe(false);

    await join(owner, workspace);

    expect(await listed()).toEqual([personal, here]);
    expect(await readable(here)).toBe(true);
  });

  it('orders by last activity, falling back to creation, and pages without gaps or overlaps', async () => {
    const newest = await chat({ lastActivity: '2026-11-05T10:00:00' });
    const tiedA = await chat({ lastActivity: '2026-11-04T10:00:00' });
    const tiedB = await chat({ lastActivity: '2026-11-04T10:00:00' });
    const legacy = await chat({
      createdAt: '2026-11-03T10:00:00',
      lastActivity: null,
    });
    const oldest = await chat({ lastActivity: '2026-11-01T10:00:00' });
    // Postgres orders UUIDs like their lowercase hex strings.
    const ties = [tiedA, tiedB].sort((a, b) => (a < b ? 1 : -1));

    const pages = [];
    for (let offset = 0; offset < 6; offset += 2) {
      pages.push(
        await repository.findPastChats({
          userId: owner,
          scope: everywhere,
          activity: {},
          pagination: { limit: 2, offset },
        }),
      );
    }

    expect(
      pages.flatMap((page) => page.data.map((thread) => thread.id)),
    ).toEqual([newest, ...ties, legacy, oldest]);
    expect(pages.map((page) => page.total)).toEqual([5, 5, 5]);
  });

  it('keeps chats with a user or assistant message in [from, before)', async () => {
    const onFrom = await chat();
    await message(onFrom, '2026-11-02T00:00:00');
    const beforeEnd = await chat();
    await message(beforeEnd, '2026-11-03T23:59:59', MessageRole.ASSISTANT);
    const onBefore = await chat();
    await message(onBefore, '2026-11-04T00:00:00');
    const earlier = await chat();
    await message(earlier, '2026-11-01T23:59:59');
    const toolOnly = await chat();
    await message(toolOnly, '2026-11-02T12:00:00', MessageRole.TOOL);
    await message(toolOnly, '2026-11-02T12:00:00', MessageRole.SYSTEM);
    const empty = await chat();

    const range = {
      from: at('2026-11-02T00:00:00'),
      before: at('2026-11-04T00:00:00'),
    };
    expect(new Set(await listed(everywhere, owner, range))).toEqual(
      new Set([onFrom, beforeEnd]),
    );
    expect(
      new Set(await listed(everywhere, owner, { from: range.from })),
    ).toEqual(new Set([onFrom, beforeEnd, onBefore]));
    expect(
      new Set(await listed(everywhere, owner, { before: range.from })),
    ).toEqual(new Set([earlier]));
    expect(await listed()).toHaveLength(6);
    expect(await listed()).toContain(empty);
  });

  it('reads a chat with its messages in creation order', async () => {
    const id = await chat();
    const second = await message(
      id,
      '2026-11-02T10:01:00',
      MessageRole.ASSISTANT,
    );
    const first = await message(id, '2026-11-02T10:00:00');
    const third = await message(id, '2026-11-02T10:02:00');

    const thread = await repository.findPastChat({
      userId: owner,
      scope: everywhere,
      threadId: id,
    });

    expect(thread?.messages.map((item) => item.id)).toEqual([
      first,
      second,
      third,
    ]);
  });
});
