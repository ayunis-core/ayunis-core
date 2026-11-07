import { randomUUID } from 'crypto';
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
import { LocalReleaseNotesRepository } from './local-release-notes.repository';
import { ReleaseNoteMapper } from './mappers/release-note.mapper';
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
      entities: [releaseNoteSchema],
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
    await db.getRepository(ReleaseNoteRecord).clear();
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

    const stored = await repository.findAll();
    expect(stored).toHaveLength(3);
    expect(stored).toEqual(expect.arrayContaining(notes));
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
    const stored = aReleaseNote({ id: randomUUID() });
    await repository.insertMany([stored]);

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
          aReleaseNote({ id: stored.id, headline: 'Geändert' }),
        );
        await repository.deleteByIds([stored.id]);
        throw new Error('the sync failed before it committed');
      }),
    ).rejects.toThrow('the sync failed before it committed');

    txHost.tx = undefined;
    await expect(repository.findAll()).resolves.toEqual([stored]);
  });
});
