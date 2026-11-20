import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema, type EntityManager } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import {
  aReleaseNote,
  TEST_IMAGE_PATH,
  TEST_LOOM_URL,
} from 'src/domain/release-notes/application/testing/release-note.fixtures';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { LocalReleaseNotesRepository } from './local-release-notes.repository';
import { ReleaseNoteMapper } from './mappers/release-note.mapper';
import { ReleaseNoteReadRecord } from './schema/release-note-read.record';
import { ReleaseNoteRecord } from './schema/release-note.record';

// Decorator metadata does not resolve the id's UUID type under Jest.
const releaseNoteSchema = new EntitySchema<ReleaseNoteRecord>({
  name: 'ReleaseNoteRecord',
  target: ReleaseNoteRecord,
  tableName: 'release_notes',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    announcableId: { type: String, unique: true },
    headline: { type: String },
    body: { type: 'text' },
    mediaType: { type: String, nullable: true },
    mediaUrl: { type: String, nullable: true },
    mediaStorageKey: { type: String, nullable: true },
    mediaContentType: { type: String, nullable: true },
    imageSourcePath: { type: 'text', nullable: true },
    lastUpdateOn: { type: String },
    announced: { type: Boolean, default: false },
    publishedOn: { type: 'date', nullable: true },
  },
});
// Only the column the unread rule reads, so the test needs no complete users.
const userSchema = new EntitySchema<UserRecord>({
  name: 'UserRecord',
  target: UserRecord,
  tableName: 'users',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
  },
});
// The foreign key is the one of the migration: deleting a note deletes its
// read marks.
const readSchema = new EntitySchema<ReleaseNoteReadRecord>({
  name: 'ReleaseNoteReadRecord',
  target: ReleaseNoteReadRecord,
  tableName: 'release_note_reads',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    userId: { type: 'uuid' },
    releaseNoteId: { type: 'uuid' },
  },
  uniques: [{ columns: ['userId', 'releaseNoteId'] }],
  relations: {
    releaseNote: {
      type: 'many-to-one',
      target: 'ReleaseNoteRecord',
      joinColumn: { name: 'releaseNoteId' },
      onDelete: 'CASCADE',
    },
  },
});

describe('LocalReleaseNotesRepository (PostgreSQL)', () => {
  let db: DataSource;
  let repository: LocalReleaseNotesRepository;
  let schema: string;
  const txHost = { tx: undefined as EntityManager | undefined };

  const image = {
    type: NotificationMediaType.IMAGE as const,
    storageKey:
      'release-notes/c76cd1b4-3b80-4666-bc4f-913161122056/0123456789abcdef.webp',
    contentType: 'image/webp',
  };

  beforeAll(async () => {
    schema = `release_notes_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [releaseNoteSchema, userSchema, readSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    repository = new LocalReleaseNotesRepository(
      db.getRepository(ReleaseNoteRecord),
      new ReleaseNoteMapper(),
      txHost as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  }, 30_000);

  beforeEach(async () => {
    txHost.tx = undefined;
    await db.getRepository(ReleaseNoteReadRecord).clear();
    await db
      .getRepository(ReleaseNoteRecord)
      .createQueryBuilder()
      .delete()
      .execute();
    await db.getRepository(UserRecord).clear();
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  it('stores notes with each kind of media and reads them back', async () => {
    const notes = [
      aReleaseNote({
        id: randomUUID(),
        media: image,
        imageSourcePath: TEST_IMAGE_PATH,
      }),
      aReleaseNote({
        id: randomUUID(),
        announcableId: '0c77830d-8211-4cad-a159-0330c5ada41b',
        media: { type: NotificationMediaType.LOOM, url: TEST_LOOM_URL },
      }),
      aReleaseNote({
        id: randomUUID(),
        announcableId: 'ba325d69-7c73-4cd6-b736-5892ea66a53b',
      }),
    ];

    await repository.insertMany(notes);

    const found = await repository.findAll();
    expect(found).toHaveLength(3);
    expect(found).toEqual(expect.arrayContaining(notes));
  });

  it('updates a stored note in place', async () => {
    const note = aReleaseNote({
      id: randomUUID(),
      media: image,
      imageSourcePath: TEST_IMAGE_PATH,
    });
    await repository.insertMany([note]);
    const edited = aReleaseNote({
      id: note.id,
      headline: 'Auto und Max Modus – jetzt für alle',
      body: 'Ab sofort für alle Organisationen.',
      lastUpdateOn: '2026-11-06 09:00:00.000001 +0000 UTC',
    });

    await repository.update(edited);

    await expect(repository.findAll()).resolves.toEqual([edited]);
  });

  it('does not create a note it is asked to update', async () => {
    await repository.update(aReleaseNote({ id: randomUUID() }));

    await expect(repository.findAll()).resolves.toEqual([]);
  });

  it('deletes notes by id', async () => {
    const kept = aReleaseNote({ id: randomUUID() });
    const deleted = aReleaseNote({
      id: randomUUID(),
      announcableId: 'ba325d69-7c73-4cd6-b736-5892ea66a53b',
    });
    await repository.insertMany([kept, deleted]);

    await repository.deleteByIds([deleted.id]);

    await expect(repository.findAll()).resolves.toEqual([kept]);
  });

  it('writes through the ambient transaction, so a failed sync stores nothing', async () => {
    const committed = aReleaseNote({ id: randomUUID() });
    await repository.insertMany([committed]);

    await expect(
      db.transaction(async (manager) => {
        txHost.tx = manager;
        await repository.insertMany([
          aReleaseNote({
            id: randomUUID(),
            announcableId: 'ba325d69-7c73-4cd6-b736-5892ea66a53b',
          }),
        ]);
        await repository.update(
          aReleaseNote({ id: committed.id, headline: 'Geändert' }),
        );
        await repository.deleteByIds([committed.id]);
        throw new Error('the sync failed before it committed');
      }),
    ).rejects.toThrow('the sync failed before it committed');

    txHost.tx = undefined;
    await expect(repository.findAll()).resolves.toEqual([committed]);
  });

  describe('as one user sees them', () => {
    const OTHER_ANNOUNCABLE_ID = 'ba325d69-7c73-4cd6-b736-5892ea66a53b';

    async function aUser(createdAt: string): Promise<UUID> {
      const id = randomUUID();
      await db.query(
        `INSERT INTO "${schema}"."users" ("id", "createdAt") VALUES ($1, $2)`,
        [id, createdAt],
      );
      return id;
    }

    async function aStoredNote(
      createdAt: string,
      overrides: Parameters<typeof aReleaseNote>[0] = {},
    ): Promise<UUID> {
      const note = aReleaseNote({ id: randomUUID(), ...overrides });
      await repository.insertMany([note]);
      await db.query(
        `UPDATE "${schema}"."release_notes" SET "createdAt" = $2 WHERE "id" = $1`,
        [note.id, createdAt],
      );
      return note.id;
    }

    it('lists every note newest first, whoever the reader is', async () => {
      const reader = await aUser('2026-01-01');
      const older = await aStoredNote('2026-11-01');
      const newer = await aStoredNote('2026-11-05', {
        announcableId: OTHER_ANNOUNCABLE_ID,
      });

      const notes = await repository.findNewestForUser(reader, 10);

      expect(notes.map(({ note }) => note.id)).toEqual([newer, older]);
      await expect(
        repository.findNewestForUser(reader, 1),
      ).resolves.toHaveLength(1);
    });

    it('orders by the date Announcable gives a note, not by when it was synced', async () => {
      const reader = await aUser('2026-01-01');
      const syncedLastDatedFirst = await aStoredNote('2026-11-07', {
        publishedOn: '2026-10-20',
      });
      const syncedFirstDatedLast = await aStoredNote('2026-11-01', {
        announcableId: OTHER_ANNOUNCABLE_ID,
        publishedOn: '2026-11-05',
      });

      const notes = await repository.findNewestForUser(reader, 10);

      expect(notes.map(({ note }) => [note.id, note.date])).toEqual([
        [syncedFirstDatedLast, '2026-11-05'],
        [syncedLastDatedFirst, '2026-10-20'],
      ]);
    });

    it('orders a note without an Announcable date by the day it was synced, which is the date shown', async () => {
      const reader = await aUser('2026-01-01');
      const datedOlder = await aStoredNote('2026-11-01', {
        publishedOn: '2026-10-20',
      });
      const undatedNewer = await aStoredNote('2026-11-05', {
        announcableId: OTHER_ANNOUNCABLE_ID,
      });

      const notes = await repository.findNewestForUser(reader, 10);

      expect(notes.map(({ note }) => note.id)).toEqual([
        undatedNewer,
        datedOlder,
      ]);
    });

    it('is unread only when announced after the reader joined and not opened', async () => {
      const early = await aUser('2026-01-01');
      const late = await aUser('2026-11-10');
      const oldNews = await aStoredNote('2026-11-01');
      const announced = await aStoredNote('2026-11-05', {
        announcableId: OTHER_ANNOUNCABLE_ID,
        announced: true,
      });

      await expect(
        repository.findOneForUser(early, announced),
      ).resolves.toMatchObject({ unread: true, note: { id: announced } });
      await expect(
        repository.findOneForUser(early, oldNews),
      ).resolves.toMatchObject({ unread: false });
      await expect(
        repository.findOneForUser(late, announced),
      ).resolves.toMatchObject({ unread: false });
      await expect(repository.countUnread(early, 100)).resolves.toBe(1);
      await expect(repository.countUnread(late, 100)).resolves.toBe(0);
    });

    it('counts only unread notes the list shows, so the bell never points at a note out of reach', async () => {
      const reader = await aUser('2026-01-01');
      await aStoredNote('2026-11-01', { announced: true });
      const newest = await aStoredNote('2026-11-05', {
        announcableId: OTHER_ANNOUNCABLE_ID,
        announced: true,
      });

      await expect(repository.countUnread(reader, 100)).resolves.toBe(2);
      await expect(repository.countUnread(reader, 1)).resolves.toBe(1);

      await repository.markRead(reader, newest);

      await expect(repository.countUnread(reader, 1)).resolves.toBe(0);
      await expect(repository.countUnread(reader, 100)).resolves.toBe(1);
    });

    it('marks a note read for the reader only, once', async () => {
      const reader = await aUser('2026-01-01');
      const colleague = await aUser('2026-01-01');
      const note = await aStoredNote('2026-11-05', { announced: true });

      await repository.markRead(reader, note);
      await repository.markRead(reader, note);

      await expect(
        repository.findOneForUser(reader, note),
      ).resolves.toMatchObject({ unread: false });
      await expect(repository.countUnread(reader, 100)).resolves.toBe(0);
      await expect(
        repository.findOneForUser(colleague, note),
      ).resolves.toMatchObject({ unread: true });
      await expect(
        db.getRepository(ReleaseNoteReadRecord).count(),
      ).resolves.toBe(1);
    });

    it('finds nothing and marks nothing for a note that does not exist', async () => {
      const reader = await aUser('2026-01-01');
      const missing = randomUUID();

      await expect(
        repository.markRead(reader, missing),
      ).resolves.toBeUndefined();

      await expect(
        repository.findOneForUser(reader, missing),
      ).resolves.toBeNull();
      await expect(
        db.getRepository(ReleaseNoteReadRecord).count(),
      ).resolves.toBe(0);
    });

    it('is unread again when a deleted note is created anew', async () => {
      const reader = await aUser('2026-01-01');
      const note = await aStoredNote('2026-11-05', { announced: true });
      await repository.markRead(reader, note);

      await repository.deleteByIds([note]);
      const recreated = await aStoredNote('2026-11-06', { announced: true });

      await expect(
        db.getRepository(ReleaseNoteReadRecord).count(),
      ).resolves.toBe(0);
      await expect(
        repository.findOneForUser(reader, recreated),
      ).resolves.toMatchObject({ unread: true });
    });
  });
});
