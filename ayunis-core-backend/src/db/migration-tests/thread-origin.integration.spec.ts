import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { AddOriginToThreads1795121973900 } from 'src/db/migrations/1795121973900-AddOriginToThreads';
import { BackfillThreadOrigin1795121973901 } from 'src/db/migrations/1795121973901-BackfillThreadOrigin';
import { ReplaceThreadTypeWithOrigin1795122030540 } from 'src/db/migrations/1795122030540-ReplaceThreadTypeWithOrigin';
import { AddReleaseNoteThreadOrigin1795122030541 } from 'src/db/migrations/1795122030541-AddReleaseNoteThreadOrigin';
import { BackfillReleaseNoteThreadOrigin1795122030542 } from 'src/db/migrations/1795122030542-BackfillReleaseNoteThreadOrigin';
import { CheckReleaseNoteThreadOrigin1795122030543 } from 'src/db/migrations/1795122030543-CheckReleaseNoteThreadOrigin';
import { AddOnboardingOriginToThreads1795162997413 } from 'src/db/migrations/1795162997413-AddOnboardingOriginToThreads';

const migrations: MigrationInterface[] = [
  new AddOriginToThreads1795121973900(),
  new BackfillThreadOrigin1795121973901(),
  new ReplaceThreadTypeWithOrigin1795122030540(),
  new AddReleaseNoteThreadOrigin1795122030541(),
  new BackfillReleaseNoteThreadOrigin1795122030542(),
  new CheckReleaseNoteThreadOrigin1795122030543(),
  new AddOnboardingOriginToThreads1795162997413(),
];
const liveRoutine = randomUUID();
const deletedRoutine = randomUUID();
const liveNotification = randomUUID();
const deletedNotification = randomUUID();
const liveReleaseNote = randomUUID();
const deletedReleaseNote = randomUUID();
const userId = randomUUID();

interface ThreadRow {
  id: string;
  type?: string;
  origin?: string;
  routineId: string | null;
  sourceNotificationId: string | null;
  sourceReleaseNoteId: string | null;
  onboardingStage?: string | null;
}

describe('thread origin migrations', () => {
  let db: DataSource;
  let runner: QueryRunner;
  let schema: string;

  beforeAll(async () => {
    db = new DataSource({
      ...typeormConfigRaw,
      entities: [],
      migrations: [],
      migrationsRun: false,
      synchronize: false,
      logging: false,
    });
    await db.initialize();
  }, 30_000);

  beforeEach(async () => {
    schema = `ayc1986_${randomUUID().replaceAll('-', '')}`;
    runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET LOCAL search_path TO "${schema}"`);
    // The generated statements name the enum types in "public", which
    // already holds the migrated schema; point them at the test schema.
    const query = runner.query.bind(runner);
    jest
      .spyOn(runner, 'query')
      .mockImplementation((sql: string, parameters?: unknown[]) =>
        query(sql.replaceAll('"public".', `"${schema}".`), parameters),
      );
    await createPreMigrationSchema();
  }, 30_000);

  afterEach(async () => {
    jest.restoreAllMocks();
    await runner.rollbackTransaction();
    await runner.release();
  }, 30_000);

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  }, 30_000);

  async function createPreMigrationSchema(): Promise<void> {
    await runner.query('CREATE TABLE routines (id varchar PRIMARY KEY)');
    await runner.query('CREATE TABLE notifications (id varchar PRIMARY KEY)');
    await runner.query('CREATE TABLE release_notes (id varchar PRIMARY KEY)');
    await runner.query(
      `CREATE TYPE threads_type_enum AS ENUM('chat', 'routine')`,
    );
    await runner.query(`CREATE TABLE threads (
      id varchar PRIMARY KEY,
      "userId" varchar NOT NULL,
      type threads_type_enum NOT NULL DEFAULT 'chat',
      "routineId" varchar REFERENCES routines(id) ON DELETE SET NULL,
      "sourceNotificationId" varchar
        REFERENCES notifications(id) ON DELETE SET NULL,
      "sourceReleaseNoteId" varchar
        REFERENCES release_notes(id) ON DELETE SET NULL
    )`);
    await runner.query('INSERT INTO routines VALUES ($1), ($2)', [
      liveRoutine,
      deletedRoutine,
    ]);
    await runner.query('INSERT INTO notifications VALUES ($1), ($2)', [
      liveNotification,
      deletedNotification,
    ]);
    await runner.query('INSERT INTO release_notes VALUES ($1), ($2)', [
      liveReleaseNote,
      deletedReleaseNote,
    ]);
  }

  async function insertThread(
    id: string,
    columns: Partial<Omit<ThreadRow, 'id'>>,
  ): Promise<void> {
    const names = ['id', 'userId', ...Object.keys(columns)];
    const placeholders = names.map((_, index) => `$${index + 1}`);
    await runner.query(
      `INSERT INTO threads ("${names.join('", "')}") VALUES (${placeholders.join(', ')})`,
      [id, userId, ...Object.values(columns)],
    );
  }

  async function insertExistingThreads(): Promise<void> {
    await insertThread('routine-live', {
      type: 'routine',
      routineId: liveRoutine,
    });
    await insertThread('routine-deleted', {
      type: 'routine',
      routineId: deletedRoutine,
    });
    await insertThread('notification-live', {
      sourceNotificationId: liveNotification,
    });
    await insertThread('notification-deleted', {
      sourceNotificationId: deletedNotification,
    });
    await insertThread('release-note-live', {
      sourceReleaseNoteId: liveReleaseNote,
    });
    await insertThread('release-note-deleted', {
      sourceReleaseNoteId: deletedReleaseNote,
    });
    await insertThread('chat', {});
    await runner.query('DELETE FROM routines WHERE id = $1', [deletedRoutine]);
    await runner.query('DELETE FROM notifications WHERE id = $1', [
      deletedNotification,
    ]);
    await runner.query('DELETE FROM release_notes WHERE id = $1', [
      deletedReleaseNote,
    ]);
  }

  // A failed statement aborts the test's transaction; the savepoint keeps it usable.
  async function errorCodeOf(
    statement: () => Promise<unknown>,
  ): Promise<unknown> {
    await runner.query('SAVEPOINT attempt');
    try {
      await statement();
      return null;
    } catch (error) {
      await runner.query('ROLLBACK TO SAVEPOINT attempt');
      return (error as { code?: unknown }).code;
    }
  }

  async function up(): Promise<void> {
    for (const migration of migrations) await migration.up(runner);
  }

  async function down(): Promise<void> {
    for (const migration of [...migrations].reverse()) {
      await migration.down(runner);
    }
  }

  async function threads(column: 'type' | 'origin'): Promise<ThreadRow[]> {
    return runner.query(
      `SELECT id, "${column}", "routineId", "sourceNotificationId",
         "sourceReleaseNoteId"
       FROM threads ORDER BY id`,
    );
  }

  it('gives existing routine threads, notification chats and release-note chats their origin and every other thread chat', async () => {
    await insertExistingThreads();

    await up();

    expect(await threads('origin')).toEqual([
      {
        id: 'chat',
        origin: 'chat',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'notification-deleted',
        origin: 'chat',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'notification-live',
        origin: 'notification',
        routineId: null,
        sourceNotificationId: liveNotification,
        sourceReleaseNoteId: null,
      },
      {
        id: 'release-note-deleted',
        origin: 'chat',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'release-note-live',
        origin: 'release_note',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: liveReleaseNote,
      },
      {
        id: 'routine-deleted',
        origin: 'routine',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'routine-live',
        origin: 'routine',
        routineId: liveRoutine,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
    ]);
  });

  it('refuses to migrate a thread with both a routine and a notification, before changing any thread', async () => {
    await insertThread('both', {
      type: 'routine',
      routineId: liveRoutine,
      sourceNotificationId: liveNotification,
    });
    await insertThread('routine-live', {
      type: 'routine',
      routineId: liveRoutine,
    });
    await migrations[0].up(runner);

    await expect(migrations[1].up(runner)).rejects.toThrow(/both/);
    expect(await runner.query('SELECT DISTINCT origin FROM threads')).toEqual([
      { origin: 'chat' },
    ]);
  });

  it('restores every thread type on rollback', async () => {
    await insertExistingThreads();
    await up();

    await down();

    expect(await threads('type')).toEqual([
      {
        id: 'chat',
        type: 'chat',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'notification-deleted',
        type: 'chat',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'notification-live',
        type: 'chat',
        routineId: null,
        sourceNotificationId: liveNotification,
        sourceReleaseNoteId: null,
      },
      {
        id: 'release-note-deleted',
        type: 'chat',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'release-note-live',
        type: 'chat',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: liveReleaseNote,
      },
      {
        id: 'routine-deleted',
        type: 'routine',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'routine-live',
        type: 'routine',
        routineId: liveRoutine,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
    ]);
  });

  it('rejects a link that does not match the origin, with 23514', async () => {
    await up();

    expect(
      await errorCodeOf(() =>
        insertThread('chat-with-routine', { routineId: liveRoutine }),
      ),
    ).toBe('23514');
    expect(
      await errorCodeOf(() =>
        insertThread('routine-with-notification', {
          origin: 'routine',
          sourceNotificationId: liveNotification,
        }),
      ),
    ).toBe('23514');
    expect(
      await errorCodeOf(() =>
        insertThread('routine', { origin: 'routine', routineId: liveRoutine }),
      ),
    ).toBeNull();
  });

  it('keeps the origin when the routine or notification is deleted', async () => {
    await insertExistingThreads();
    await up();

    await runner.query('DELETE FROM routines WHERE id = $1', [liveRoutine]);
    await runner.query('DELETE FROM notifications WHERE id = $1', [
      liveNotification,
    ]);

    expect(
      (await threads('origin')).filter((thread) =>
        ['routine-live', 'notification-live'].includes(thread.id),
      ),
    ).toEqual([
      {
        id: 'notification-live',
        origin: 'notification',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'routine-live',
        origin: 'routine',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
    ]);
  });

  it('refuses to give a release-note origin to a thread that has another origin, before changing it', async () => {
    await insertThread('routine-with-release-note', {
      type: 'routine',
      routineId: liveRoutine,
      sourceReleaseNoteId: liveReleaseNote,
    });
    for (const migration of migrations.slice(0, 4)) {
      await migration.up(runner);
    }

    await expect(migrations[4].up(runner)).rejects.toThrow(/another origin/);
    expect(await runner.query('SELECT DISTINCT origin FROM threads')).toEqual([
      { origin: 'routine' },
    ]);
  });

  it('rejects a release-note link on a thread of another origin, with 23514', async () => {
    await up();

    expect(
      await errorCodeOf(() =>
        insertThread('chat-with-release-note', {
          sourceReleaseNoteId: liveReleaseNote,
        }),
      ),
    ).toBe('23514');
    expect(
      await errorCodeOf(() =>
        insertThread('release-note', {
          origin: 'release_note',
          sourceReleaseNoteId: liveReleaseNote,
        }),
      ),
    ).toBeNull();
  });

  it('rejects an onboarding stage outside an onboarding chat and an onboarding chat without one, with 23514', async () => {
    await up();

    for (const [id, columns] of [
      ['chat-with-stage', { onboardingStage: 'profile' }],
      [
        'notification-with-stage',
        {
          origin: 'notification',
          sourceNotificationId: liveNotification,
          onboardingStage: 'profile',
        },
      ],
      ['onboarding-without-stage', { origin: 'onboarding' }],
    ] as const) {
      expect(await errorCodeOf(() => insertThread(id, columns))).toBe('23514');
    }
    expect(
      await errorCodeOf(() =>
        insertThread('onboarding', {
          origin: 'onboarding',
          onboardingStage: 'first_skill',
        }),
      ),
    ).toBeNull();
    expect(
      await errorCodeOf(() =>
        insertThread('routine', { origin: 'routine', routineId: liveRoutine }),
      ),
    ).toBeNull();
  });

  it('keeps the release-note origin when the release note is deleted', async () => {
    await insertExistingThreads();
    await up();

    await runner.query('DELETE FROM release_notes WHERE id = $1', [
      liveReleaseNote,
    ]);

    expect(
      (await threads('origin')).find(
        (thread) => thread.id === 'release-note-live',
      ),
    ).toEqual({
      id: 'release-note-live',
      origin: 'release_note',
      routineId: null,
      sourceNotificationId: null,
      sourceReleaseNoteId: null,
    });
  });

  it('turns onboarding chats into plain chats when the onboarding origin is rolled back', async () => {
    await insertExistingThreads();
    await up();
    await insertThread('onboarding', {
      origin: 'onboarding',
      onboardingStage: 'profile',
    });

    await migrations.at(-1)!.down(runner);

    expect(await threads('origin')).toEqual([
      {
        id: 'chat',
        origin: 'chat',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'notification-deleted',
        origin: 'chat',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'notification-live',
        origin: 'notification',
        routineId: null,
        sourceNotificationId: liveNotification,
        sourceReleaseNoteId: null,
      },
      {
        id: 'onboarding',
        origin: 'chat',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'release-note-deleted',
        origin: 'chat',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'release-note-live',
        origin: 'release_note',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: liveReleaseNote,
      },
      {
        id: 'routine-deleted',
        origin: 'routine',
        routineId: null,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
      {
        id: 'routine-live',
        origin: 'routine',
        routineId: liveRoutine,
        sourceNotificationId: null,
        sourceReleaseNoteId: null,
      },
    ]);
    expect(
      await errorCodeOf(() =>
        insertThread('chat-with-routine', { routineId: liveRoutine }),
      ),
    ).toBe('23514');
  });
});
