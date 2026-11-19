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
import type { PastMessageMatch } from 'src/domain/threads/application/models/past-message-match';
import {
  InvalidPastMessagePatternError,
  PastMessageSearchTimeoutError,
} from 'src/domain/threads/application/threads.errors';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';
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
    origin: { type: String, default: ThreadOriginKind.CHAT },
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
      origin?: ThreadOriginKind;
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
      origin: rest.origin ?? ThreadOriginKind.CHAT,
      createdAt: at(rest.createdAt ?? '2026-10-01T08:00:00'),
      lastActivityAt: lastActivity === null ? () => 'NULL' : at(lastActivity),
    });
    return id;
  }

  async function message(
    threadId: UUID,
    createdAt: string,
    role = MessageRole.USER,
    content: MessageRecord['content'] | string = 'Wie hoch ist sie?',
  ): Promise<UUID> {
    const id = randomUUID();
    await db.getRepository(MessageRecord).save({
      id,
      threadId,
      role,
      content:
        typeof content === 'string'
          ? [{ type: MessageContentType.TEXT, text: content }]
          : content,
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

  async function grep(
    pattern: string,
    options: {
      scope?: PastChatScope;
      userId?: UUID;
      created?: PastChatActivityRange;
      limit?: number;
    } = {},
    on: LocalThreadsRepository = repository,
  ): Promise<PastMessageMatch[]> {
    return on.grepPastMessages({
      userId: options.userId ?? owner,
      scope: options.scope ?? everywhere,
      pattern,
      created: options.created ?? {},
      limit: options.limit ?? 50,
    });
  }

  const grepped = async (
    pattern: string,
    options: Parameters<typeof grep>[1] = {},
  ) => (await grep(pattern, options)).map((match) => match.excerpt);

  const readable = async (
    threadId: UUID,
    scope: PastChatScope = everywhere,
    userId: UUID = owner,
  ) => (await repository.findPastChat({ userId, scope, threadId })) !== null;

  it('offers only the user’s own chats, notification chats included, never anonymous or routine ones or the current chat', async () => {
    const own = await chat();
    const aboutNotification = await chat({
      origin: ThreadOriginKind.NOTIFICATION,
      lastActivity: '2026-11-02T10:00:00',
    });
    const excluded = [
      await chat({ id: currentChat }),
      await chat({ isAnonymous: true }),
      await chat({ origin: ThreadOriginKind.ROUTINE }),
    ];
    const colleagues = await chat({ userId: colleague });

    expect(await listed()).toEqual([aboutNotification, own]);
    expect(await listed(everywhere, colleague)).toEqual([colleagues]);
    for (const id of [...excluded, colleagues]) {
      expect(await readable(id)).toBe(false);
    }
    expect(await readable(own)).toBe(true);
    expect(await readable(aboutNotification)).toBe(true);
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
  describe('grepping past messages', () => {
    it('matches a plain word in any case, inside longer words too', async () => {
      const id = await chat();
      await message(
        id,
        '2026-11-02T10:00:00',
        MessageRole.USER,
        'Der BAUANTRAG für die Musterstraße',
      );
      await message(
        id,
        '2026-11-02T10:01:00',
        MessageRole.ASSISTANT,
        'Der Antrag ist eingegangen.',
      );
      await message(id, '2026-11-02T10:02:00', MessageRole.USER, 'Danke!');

      expect(await grepped('antrag')).toEqual([
        'Der Antrag ist eingegangen.',
        'Der BAUANTRAG für die Musterstraße',
      ]);
    });

    it('finds word forms with alternation, and \\y keeps matches inside longer words out', async () => {
      const id = await chat();
      await message(id, '2026-11-02T10:00:00', MessageRole.USER, 'Mein Antrag');
      await message(
        id,
        '2026-11-02T10:01:00',
        MessageRole.USER,
        'Zwei Anträge',
      );
      await message(
        id,
        '2026-11-02T10:02:00',
        MessageRole.USER,
        'Der Bauantrag',
      );
      await message(
        id,
        '2026-11-02T10:03:00',
        MessageRole.USER,
        'Die Antragsteller',
      );

      expect(await grepped('antr(a|ä)ge?')).toHaveLength(4);
      expect(await grepped('\\yantr(a|ä)ge?\\y')).toEqual([
        'Zwei Anträge',
        'Mein Antrag',
      ]);
      expect(await grepped('\\mantrag\\M')).toEqual(['Mein Antrag']);
    });

    it('rejects a pattern PostgreSQL cannot compile with its reason', async () => {
      await message(await chat(), '2026-11-02T10:00:00');

      const error = await grep('(').catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(InvalidPastMessagePatternError);
      expect((error as InvalidPastMessagePatternError).reason).toMatch(
        /invalid regular expression/,
      );
    });

    it('reports a search that hits the statement timeout as such', async () => {
      await message(
        await chat(),
        '2026-11-02T10:00:00',
        MessageRole.USER,
        'a'.repeat(40_001),
      );
      const impatient = new DataSource({
        ...db.options,
        extra: {
          options: `-c search_path=${schema}`,
          statement_timeout: 200,
        },
      });
      await impatient.initialize();
      try {
        const slow = new LocalThreadsRepository(
          impatient.getRepository(ThreadRecord),
          {} as ThreadMapper,
          {} as LocalThreadAssignmentsRepository,
          {} as TransactionHost<TransactionalAdapterTypeOrm>,
        );

        await expect(grep('^(a+)\\1$', {}, slow)).rejects.toBeInstanceOf(
          PastMessageSearchTimeoutError,
        );
      } finally {
        await impatient.destroy();
      }
    });

    it('returns each matching message once, newest first, up to the limit', async () => {
      const older = await chat();
      const newer = await chat();
      await message(older, '2026-11-01T10:00:00', MessageRole.USER, 'Hund 1');
      await message(newer, '2026-11-03T10:00:00', MessageRole.USER, [
        { type: MessageContentType.TEXT, text: 'Kein Treffer' },
        { type: MessageContentType.TEXT, text: 'Hund 3' },
        { type: MessageContentType.TEXT, text: 'Hund 3 noch einmal' },
      ]);
      await message(
        older,
        '2026-11-02T10:00:00',
        MessageRole.ASSISTANT,
        'Hund 2',
      );

      expect(await grepped('hund')).toEqual(['Hund 3', 'Hund 2', 'Hund 1']);
      expect(await grepped('hund', { limit: 2 })).toEqual(['Hund 3', 'Hund 2']);
    });

    it('keeps messages created in [from, before)', async () => {
      const id = await chat();
      await message(id, '2026-11-01T23:59:59', MessageRole.USER, 'Hund vorher');
      await message(
        id,
        '2026-11-02T00:00:00',
        MessageRole.USER,
        'Hund am Anfang',
      );
      await message(
        id,
        '2026-11-03T23:59:59',
        MessageRole.ASSISTANT,
        'Hund am Ende',
      );
      await message(id, '2026-11-04T00:00:00', MessageRole.USER, 'Hund danach');

      expect(
        await grepped('hund', {
          created: {
            from: at('2026-11-02T00:00:00'),
            before: at('2026-11-04T00:00:00'),
          },
        }),
      ).toEqual(['Hund am Ende', 'Hund am Anfang']);
      expect(
        await grepped('hund', {
          created: { before: at('2026-11-02T00:00:00') },
        }),
      ).toEqual(['Hund vorher']);
    });

    it('never matches skill instructions, nudges, tool calls and results, thinking or system messages', async () => {
      const id = await chat();
      await message(
        id,
        '2026-11-02T10:00:00',
        MessageRole.SYSTEM,
        'Hundesteuer',
      );
      await message(id, '2026-11-02T10:01:00', MessageRole.USER, [
        {
          type: MessageContentType.TEXT,
          text: 'Hundesteuer',
          isSkillInstruction: true,
        },
        { type: MessageContentType.TEXT, text: 'Hundesteuer', isNudge: true },
      ]);
      await message(id, '2026-11-02T10:02:00', MessageRole.ASSISTANT, [
        { type: MessageContentType.THINKING, thinking: 'Hundesteuer' },
        {
          type: MessageContentType.TOOL_USE,
          id: 'call',
          name: 'internet_search',
          params: { query: 'Hundesteuer' },
        },
      ]);
      await message(id, '2026-11-02T10:03:00', MessageRole.TOOL, [
        {
          type: MessageContentType.TOOL_RESULT,
          toolId: 'call',
          toolName: 'internet_search',
          result: 'Hundesteuer',
        },
      ]);

      expect(await grep('hundesteuer')).toEqual([]);
    });

    it('searches only the user’s own chats in scope, never anonymous or routine ones or the current chat', async () => {
      const own = await chat();
      const here = await chat({ workspaceId: workspace });
      const there = await chat({ workspaceId: otherWorkspace });
      const excluded = [
        await chat({ id: currentChat }),
        await chat({ isAnonymous: true }),
        await chat({ origin: ThreadOriginKind.ROUTINE }),
        await chat({ userId: colleague }),
        await chat({ userId: colleague, workspaceId: workspace }),
      ];
      for (const id of [own, here, there, ...excluded]) {
        await message(
          id,
          '2026-11-02T10:00:00',
          MessageRole.USER,
          `Hund in ${id}`,
        );
      }
      const threadsOf = async (options: Parameters<typeof grep>[1]) =>
        new Set((await grep('hund', options)).map((match) => match.threadId));

      expect(await threadsOf({})).toEqual(new Set([own, here, there]));
      expect(await threadsOf({ scope: inWorkspace })).toEqual(new Set([here]));
      // The colleague is no member of the workspace their chat is filed in.
      expect(await threadsOf({ userId: colleague })).toEqual(
        new Set([excluded[3]]),
      );
    });

    it('stops searching a workspace’s chats once the user leaves it and searches them again when re-added', async () => {
      const personal = await chat();
      const here = await chat({ workspaceId: workspace });
      await message(
        personal,
        '2026-11-02T10:00:00',
        MessageRole.USER,
        'Hund privat',
      );
      await message(
        here,
        '2026-11-02T10:01:00',
        MessageRole.USER,
        'Hund im Projekt',
      );
      expect(await grepped('hund')).toEqual(['Hund im Projekt', 'Hund privat']);

      await leave(owner, workspace);

      expect(await grepped('hund')).toEqual(['Hund privat']);
      expect(await grepped('hund', { scope: inWorkspace })).toEqual([]);

      await join(owner, workspace);

      expect(await grepped('hund')).toEqual(['Hund im Projekt', 'Hund privat']);
    });

    it('numbers a match like chat_read, counting every message of the chat', async () => {
      const id = await chat({ lastActivity: '2026-11-02T10:03:00' });
      await message(id, '2026-11-02T10:00:00', MessageRole.USER, 'Frage');
      await message(id, '2026-11-02T10:01:00', MessageRole.TOOL, [
        {
          type: MessageContentType.TOOL_RESULT,
          toolId: 'call',
          toolName: 'internet_search',
          result: 'Ergebnis',
        },
      ]);
      const matchId = await message(
        id,
        '2026-11-02T10:02:00',
        MessageRole.ASSISTANT,
        'Die Hundesteuer',
      );
      await message(id, '2026-11-02T10:03:00', MessageRole.USER, 'Danke');

      const [match] = await grep('hundesteuer');
      const read = await repository.findPastChat({
        userId: owner,
        scope: everywhere,
        threadId: id,
      });

      expect(match).toEqual({
        threadId: id,
        threadTitle: 'Hundesteuer',
        messageNumber: 3,
        role: MessageRole.ASSISTANT,
        createdAt: at('2026-11-02T10:02:00'),
        excerpt: 'Die Hundesteuer',
      });
      expect(read?.messages[match.messageNumber - 1].id).toBe(matchId);
    });

    it('cuts a long text to an excerpt around the first match', async () => {
      const id = await chat();
      const text = `${'x'.repeat(500)} Hundesteuer ${'y'.repeat(500)} Hundesteuer`;
      await message(id, '2026-11-02T10:00:00', MessageRole.USER, text);

      const [{ excerpt }] = await grep('hundesteuer');

      expect(excerpt).toBe(`…${text.slice(401, 701)}…`);
      expect(excerpt).toContain(' Hundesteuer ');
    });

    it('treats the pattern as a bound value', async () => {
      await message(await chat(), '2026-11-02T10:00:00');

      expect(await grep("' OR 1=1 --")).toEqual([]);
    });
  });
});
