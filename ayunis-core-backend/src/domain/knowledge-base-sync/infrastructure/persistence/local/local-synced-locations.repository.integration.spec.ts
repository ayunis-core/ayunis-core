import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID, type UUID } from 'crypto';
import {
  DataSource,
  EntitySchema,
  type EntityManager,
  type QueryRunner,
} from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { CreateKnowledgeBaseSyncTables1795019918718 } from 'src/db/migrations/1795019918718-CreateKnowledgeBaseSyncTables';
import { AddSyncedFileProcessing1795033122250 } from 'src/db/migrations/1795033122250-AddSyncedFileProcessing';
import { AddSyncedLocationSchedule1795040884040 } from 'src/db/migrations/1795040884040-AddSyncedLocationSchedule';
import { MakeSyncedLocationsProviderBased1795382453624 } from 'src/db/migrations/1795382453624-MakeSyncedLocationsProviderBased';
import { SyncedLocationLocks } from 'src/domain/knowledge-base-sync/application/services/synced-location-locks.service';
import { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { SyncedFileState } from 'src/domain/knowledge-base-sync/domain/synced-file-state.enum';
import { ConnectorSyncedLocation } from 'src/domain/knowledge-base-sync/domain/connector-synced-location.entity';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import { SyncedLocationProvider } from 'src/domain/knowledge-base-sync/domain/synced-location-provider.enum';
import { SyncedLocationState } from 'src/domain/knowledge-base-sync/domain/synced-location-state.enum';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { LockSourcesUseCase } from 'src/domain/sources/application/use-cases/lock-sources/lock-sources.use-case';
import { LocalSourceBatchWriteRepository } from 'src/domain/sources/infrastructure/persistence/local/local-source-batch-write.repository';
import { LocalSyncedLocationsRepository } from './local-synced-locations.repository';
import { SyncedFileMapper } from './mappers/synced-file.mapper';
import { SyncedLocationMapper } from './mappers/synced-location.mapper';
import { SyncedFileRecord } from './schema/synced-file.record';
import {
  ConnectorSyncedLocationRecord,
  SyncedLocationRecord,
} from './schema/synced-location.record';

// ts-jest drops the column types of the records, so the tables are declared
// explicitly; the real migration creates them.
const timestamps = {
  createdAt: { type: 'timestamp', createDate: true },
  updatedAt: { type: 'timestamp', updateDate: true },
} as const;
const locationSchema = new EntitySchema<SyncedLocationRecord>({
  name: 'SyncedLocationRecord',
  target: SyncedLocationRecord,
  tableName: 'knowledge_base_synced_locations',
  inheritance: { pattern: 'STI', column: { name: 'provider', type: String } },
  columns: {
    id: { type: String, primary: true },
    ...timestamps,
    orgId: { type: String },
    knowledgeBaseId: { type: String },
    location: { type: String },
    cursor: { type: String, nullable: true },
    state: { type: String },
    lastSyncedAt: { type: 'timestamp', nullable: true },
    nextSyncAt: { type: 'timestamptz' },
    syncingSince: { type: 'timestamptz', nullable: true },
    pausedUntil: { type: 'timestamptz', nullable: true },
  },
});
const connectorLocationSchema = new EntitySchema<ConnectorSyncedLocationRecord>(
  {
    name: 'ConnectorSyncedLocationRecord',
    target: ConnectorSyncedLocationRecord,
    type: 'entity-child',
    discriminatorValue: SyncedLocationProvider.CONNECTOR,
    columns: { connectorId: { type: String, nullable: true } },
  },
);
const fileSchema = new EntitySchema<SyncedFileRecord>({
  name: 'SyncedFileRecord',
  target: SyncedFileRecord,
  tableName: 'knowledge_base_synced_files',
  columns: {
    id: { type: String, primary: true },
    ...timestamps,
    locationId: { type: String },
    externalId: { type: String },
    name: { type: String },
    path: { type: String },
    version: { type: String },
    size: {
      type: 'bigint',
      transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
    },
    state: { type: String },
    skipReason: { type: String, nullable: true },
    sourceId: { type: String, nullable: true },
    lastSourceId: { type: String, nullable: true },
    documentVersion: { type: String, nullable: true },
    processingErrorCode: { type: String, nullable: true },
  },
});

// The tables the migration references, as far as it needs them.
const REFERENCED_TABLES = ['orgs', 'knowledge_bases', 'connectors', 'sources'];

describe('LocalSyncedLocationsRepository', () => {
  const schema = `ayc1635_sync_${randomUUID().replaceAll('-', '')}`;
  const transactions = new AsyncLocalStorage<EntityManager>();
  let db: DataSource;
  let repository: LocalSyncedLocationsRepository;
  const txHost = {
    get tx() {
      return transactions.getStore() ?? db.manager;
    },
  };

  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [locationSchema, connectorLocationSchema, fileSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const setup = db.createQueryRunner();
    await setup.createSchema(schema, true);
    await setup.query(`SET search_path TO "${schema}"`);
    for (const table of REFERENCED_TABLES)
      await setup.query(`CREATE TABLE "${table}" ("id" varchar PRIMARY KEY)`);
    // Older than the migration's foreign keys, as in the real schema, so
    // deleting a knowledge base deletes its documents before its locations.
    await setup.query(
      `ALTER TABLE "sources" ADD "knowledgeBaseId" varchar REFERENCES "knowledge_bases" ON DELETE CASCADE`,
    );
    // The migrations name their enum types in "public"; keep them in the schema.
    const inSchema = {
      query: (sql: string) =>
        setup.query(sql.replaceAll('"public".', `"${schema}".`)),
    } as QueryRunner;
    await new CreateKnowledgeBaseSyncTables1795019918718().up(inSchema);
    await new AddSyncedFileProcessing1795033122250().up(inSchema);
    await new AddSyncedLocationSchedule1795040884040().up(inSchema);
    await new MakeSyncedLocationsProviderBased1795382453624().up(inSchema);
    await setup.query('SET search_path TO public');
    await setup.release();
    repository = new LocalSyncedLocationsRepository(
      db.getRepository(SyncedLocationRecord),
      new SyncedLocationMapper(),
      new SyncedFileMapper(),
      txHost as never,
    );
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  async function insert(table: string): Promise<UUID> {
    const id = randomUUID();
    await db.query(`INSERT INTO "${schema}"."${table}" ("id") VALUES ($1)`, [
      id,
    ]);
    return id;
  }

  // Files are only ever read under lock, which takes a transaction.
  function filesOf(location: SyncedLocation): Promise<SyncedFile[]> {
    return db.transaction((manager) =>
      transactions.run(manager, () => repository.lockFiles(location.id)),
    );
  }

  async function aLocation(
    schedule: { nextSyncAt?: Date; pausedUntil?: Date } = {},
  ) {
    const location = new ConnectorSyncedLocation({
      orgId: await insert('orgs'),
      knowledgeBaseId: await insert('knowledge_bases'),
      connectorId: await insert('connectors'),
      location: 'https://municipality.sharepoint.com/sites/bauamt',
      ...schedule,
    });
    expect(await repository.create(location)).toBe(true);
    return location;
  }

  async function anImportedFile(location: SyncedLocation, sourceId?: UUID) {
    const file = new SyncedFile({
      locationId: location.id,
      externalId: `01ABC${randomUUID()}`,
      name: 'Hundesteuer.pdf',
      path: 'Satzungen/Hundesteuer.pdf',
      version: '"{1},1"',
      size: 3_000_000_000,
      state: SyncedFileState.IMPORTED,
      sourceId: sourceId ?? (await insert('sources')),
    });
    await repository.saveFiles([file]);
    return file;
  }

  it("summarizes each location's files, with its first skipped files by path", async () => {
    const location = await aLocation();
    const other = await aLocation();
    const fileAt = (path: string, state: SyncedFileState) =>
      new SyncedFile({
        locationId: location.id,
        externalId: `01ABC${randomUUID()}`,
        name: path.split('/').at(-1)!,
        path,
        version: '"{1},1"',
        size: 1024,
        state,
      });
    const failed = await anImportedFile(location);
    failed.recordProcessed(
      failed.version,
      SourceProcessingErrorCode.DOCUMENT_UNREADABLE,
    );
    const encrypted = fileAt('Intern/Gehälter.xlsx', SyncedFileState.SKIPPED);
    encrypted.skip(SyncedFileSkipReason.ENCRYPTED);
    const photo = fileAt('Bilder/Ortsplan.jpg', SyncedFileState.SKIPPED);
    photo.skip(SyncedFileSkipReason.UNSUPPORTED_TYPE);
    const archive = fileAt('Archiv/Pläne.zip', SyncedFileState.SKIPPED);
    archive.skip(SyncedFileSkipReason.UNSUPPORTED_TYPE);
    await anImportedFile(location);
    await anImportedFile(other);
    await repository.saveFiles([
      failed,
      encrypted,
      photo,
      archive,
      fileAt('Satzungen/Neu.pdf', SyncedFileState.AWAITING_CAPACITY),
    ]);

    const summaries = await repository.summarizeFiles(
      [location.id, other.id, randomUUID()],
      2,
    );

    expect(summaries).toEqual(
      new Map([
        [
          location.id,
          {
            documents: 2,
            failed: 1,
            awaitingCapacity: 1,
            skippedCount: 3,
            skipped: [
              {
                name: 'Pläne.zip',
                path: 'Archiv/Pläne.zip',
                reason: SyncedFileSkipReason.UNSUPPORTED_TYPE,
              },
              {
                name: 'Ortsplan.jpg',
                path: 'Bilder/Ortsplan.jpg',
                reason: SyncedFileSkipReason.UNSUPPORTED_TYPE,
              },
            ],
          },
        ],
        [
          other.id,
          {
            documents: 1,
            failed: 0,
            awaitingCapacity: 0,
            skippedCount: 0,
            skipped: [],
          },
        ],
      ]),
    );
  });

  it('loads a stored location as the subclass of its provider, with its connector', async () => {
    const location = await aLocation();

    const loaded = await repository.findById(location.id);

    expect(loaded).toBeInstanceOf(ConnectorSyncedLocation);
    expect(loaded).toMatchObject({
      provider: SyncedLocationProvider.CONNECTOR,
      connectorId: location.connectorId,
      location: location.location,
    });
  });

  it('keeps one location per knowledge base, provider and URL, whichever connector it syncs through', async () => {
    const location = await aLocation();

    for (const connectorId of [
      location.connectorId,
      await insert('connectors'),
    ])
      expect(
        await repository.create(
          new ConnectorSyncedLocation({
            ...location,
            id: randomUUID(),
            connectorId,
          }),
        ),
      ).toBe(false);
  });

  it('overwrites a saved file in place and keeps sizes above 2 GB', async () => {
    const location = await aLocation();
    const file = await anImportedFile(location);
    file.skip(SyncedFileSkipReason.TOO_LARGE);
    file.path = 'Archiv/Hundesteuer.pdf';

    await repository.saveFiles([file]);

    expect(await filesOf(location)).toEqual([
      expect.objectContaining({
        id: file.id,
        path: 'Archiv/Hundesteuer.pdf',
        size: 3_000_000_000,
        state: SyncedFileState.SKIPPED,
        skipReason: SyncedFileSkipReason.TOO_LARGE,
        sourceId: null,
      }),
    ]);
  });

  it('keeps the file without its document when the document is deleted', async () => {
    const location = await aLocation();
    const file = await anImportedFile(location);

    await db.query(`DELETE FROM "${schema}"."sources" WHERE id = $1`, [
      file.sourceId,
    ]);

    expect(await filesOf(location)).toEqual([
      expect.objectContaining({
        id: file.id,
        state: SyncedFileState.IMPORTED,
        sourceId: null,
      }),
    ]);
  });

  it('skips a file whose failed document a user removed, but neither another file nor one with a newer version pending', async () => {
    const location = await aLocation();
    const failed = await anImportedFile(location);
    const other = await anImportedFile(location);
    const changed = await anImportedFile(location);
    for (const file of [failed, other, changed]) {
      file.lastSourceId = file.sourceId;
      file.recordProcessed(file.version, null);
    }
    changed.version = '"{2},1"';
    await repository.saveFiles([failed, other, changed]);
    for (const file of [failed, other, changed])
      await db.query(`DELETE FROM "${schema}"."sources" WHERE id = $1`, [
        file.sourceId,
      ]);

    await repository.skipRemovedAfterFailure([
      failed.lastSourceId!,
      changed.lastSourceId!,
    ]);

    const states = new Map(
      (await filesOf(location)).map((file) => [file.id, file.state]),
    );
    expect(states).toEqual(
      new Map([
        [failed.id, SyncedFileState.SKIPPED],
        [other.id, SyncedFileState.IMPORTED],
        [changed.id, SyncedFileState.IMPORTED],
      ]),
    );
  });

  it('finds the files whose document is behind their version, by ID after the given file', async () => {
    const location = await aLocation();
    const processed = await anImportedFile(location);
    processed.recordProcessed(processed.version, null);
    const removed = await anImportedFile(location);
    removed.sourceId = null;
    await repository.saveFiles([processed, removed]);
    const pending = [
      await anImportedFile(location),
      await anImportedFile(location),
    ].sort((a, b) => a.id.localeCompare(b.id));
    await anImportedFile(await aLocation());

    const first = await repository.findFilesToProcess(location.id, null, 1);
    const rest = await repository.findFilesToProcess(
      location.id,
      first[0].id,
      10,
    );

    expect(first.map(({ id }) => id)).toEqual([pending[0].id]);
    expect(rest.map(({ id }) => id)).toEqual([pending[1].id]);
  });

  describe('schedule', () => {
    const at = (time: string) => new Date(`2000-01-01T${time}:00.000Z`);
    const now = at('01:00');
    const next = at('02:00');
    const nextSyncs = { [SyncedLocationProvider.CONNECTOR]: next };

    it('takes the due locations that are not paused, oldest first, each once', async () => {
      const oldest = await aLocation({ nextSyncAt: at('00:10') });
      const pauseOver = await aLocation({
        nextSyncAt: at('00:20'),
        pausedUntil: at('00:50'),
      });
      const later = await aLocation({ nextSyncAt: at('00:30') });
      await aLocation({ nextSyncAt: at('00:05'), pausedUntil: at('01:30') });
      await aLocation({ nextSyncAt: at('01:10') });

      const first = await repository.claimDue(now, nextSyncs, 2);
      const second = await repository.claimDue(now, nextSyncs, 2);
      const third = await repository.claimDue(now, nextSyncs, 2);

      expect(new Set(first.map(({ id }) => id))).toEqual(
        new Set([oldest.id, pauseOver.id]),
      );
      expect(second).toEqual([{ id: later.id, orgId: later.orgId }]);
      expect(third).toEqual([]);
      expect((await repository.findById(oldest.id))?.nextSyncAt).toEqual(next);
    });

    it('takes no location of a switched-off provider and leaves its next sync as it is', async () => {
      const due = await aLocation({ nextSyncAt: at('00:10') });

      expect(await repository.claimDue(now, {}, 10)).toEqual([]);
      expect((await repository.findById(due.id))?.nextSyncAt).toEqual(
        at('00:10'),
      );
    });

    it('leaves a location its running sync holds to a later sweep, without waiting for it', async () => {
      const held = await aLocation({ nextSyncAt: at('00:40') });
      let release!: () => void;
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      let locked!: () => void;
      const isLocked = new Promise<void>((resolve) => {
        locked = resolve;
      });
      const sync = db.transaction((manager) =>
        transactions.run(manager, async () => {
          await repository.lockById(held.id);
          locked();
          await released;
        }),
      );
      await isLocked;

      const claimed = await repository.claimDue(now, nextSyncs, 10);
      release();
      await sync;

      expect(claimed.map(({ id }) => id)).not.toContain(held.id);
      expect(
        (await repository.claimDue(now, nextSyncs, 10)).map(({ id }) => id),
      ).toContain(held.id);
    });

    it('keeps the later end when a location is paused twice', async () => {
      const location = await aLocation();

      await repository.pause(location.id, at('01:30'));
      await repository.pause(location.id, at('01:10'));

      expect((await repository.findById(location.id))?.pausedUntil).toEqual(
        at('01:30'),
      );
    });

    it('keeps the start of a running sync until it ends, then schedules the next', async () => {
      const location = await aLocation();

      await repository.recordSyncStarted(location.id, at('00:10'));
      await repository.recordSyncStarted(location.id, at('00:20'));
      const running = await repository.findById(location.id);
      await repository.recordSyncEnded(location.id, nextSyncs);
      const ended = await repository.findById(location.id);

      expect(running?.syncingSince).toEqual(at('00:10'));
      expect(ended).toMatchObject({ syncingSince: null, nextSyncAt: next });
    });
  });

  it('rejects a skipped file without its reason', async () => {
    const location = await aLocation();
    const file = await anImportedFile(location);
    file.state = SyncedFileState.SKIPPED;
    file.sourceId = null;

    await expect(repository.saveFiles([file])).rejects.toThrow(
      /CHK_knowledge_base_synced_files_skip_reason/,
    );
  });

  it.each(['knowledge_bases', 'connectors', 'orgs'])(
    'removes locations and their files with their %s row',
    async (table) => {
      const location = await aLocation();
      await anImportedFile(location);
      const owner = {
        knowledge_bases: location.knowledgeBaseId,
        connectors: location.connectorId,
        orgs: location.orgId,
      }[table];

      await db.query(`DELETE FROM "${schema}"."${table}" WHERE id = $1`, [
        owner,
      ]);

      expect(await repository.findById(location.id)).toBeNull();
      expect(await filesOf(location)).toEqual([]);
    },
  );

  it('marks a location inaccessible only while no newer sync was recorded', async () => {
    const outdated = await aLocation();
    const current = await aLocation();
    await repository.recordSync(current.id, 'delta-1', new Date());
    const readOutdated = await repository.findById(outdated.id);
    const readCurrent = await repository.findById(current.id);
    await repository.recordSync(outdated.id, 'delta-1', new Date());

    await repository.markNoLongerAccessible(
      outdated.id,
      readOutdated!.lastSyncedAt,
    );
    await repository.markNoLongerAccessible(
      current.id,
      readCurrent!.lastSyncedAt,
    );

    expect((await repository.findById(outdated.id))?.state).toBe(
      SyncedLocationState.ACTIVE,
    );
    expect((await repository.findById(current.id))?.state).toBe(
      SyncedLocationState.NO_LONGER_ACCESSIBLE,
    );
  });

  describe('locked for a sync or a removal (SyncedLocationLocks)', () => {
    function locks() {
      return new SyncedLocationLocks(
        repository,
        // No organization is deleted here.
        { execute: () => Promise.resolve() } as never,
        {
          execute: ({ knowledgeBaseId }: { knowledgeBaseId: UUID }) =>
            txHost.tx.query(
              `SELECT 1 FROM "knowledge_bases" WHERE id = $1 FOR UPDATE`,
              [knowledgeBaseId],
            ),
        } as never,
        new LockSourcesUseCase(
          new LocalSourceBatchWriteRepository({} as never, txHost as never),
        ),
      );
    }

    async function begin(): Promise<QueryRunner> {
      const runner = db.createQueryRunner();
      await runner.startTransaction();
      await runner.query(`SET LOCAL search_path TO "${schema}"`);
      return runner;
    }

    async function commit(runner: QueryRunner, work: Promise<unknown>) {
      try {
        await work;
        await runner.commitTransaction();
      } finally {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        await runner.release();
      }
    }

    /** Runs `sql` in its own transaction once it waits for a lock. */
    async function waitingForALock(sql: string, params: unknown[]) {
      const runner = await begin();
      const [{ pid }] = (await runner.query(
        'SELECT pg_backend_pid() AS pid',
      )) as [{ pid: number }];
      const done = commit(runner, runner.query(sql, params));
      await untilWaitingForALock(pid);
      return { done };
    }

    async function untilWaitingForALock(pid: number) {
      for (let attempt = 0; attempt < 250; attempt++) {
        const [activity] = await db.query(
          'SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1',
          [pid],
        );
        if (activity.wait_event_type === 'Lock') return;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error(`Backend ${pid} never waited for a lock`);
    }

    /** Takes the location's locks, then runs `work` in the same transaction. */
    async function withLocked(
      location: SyncedLocation,
      work: (manager: EntityManager) => Promise<void>,
      lock: (taken: SyncedLocationLocks) => Promise<unknown> = (taken) =>
        taken.lock(location),
    ) {
      const runner = await begin();
      await commit(
        runner,
        transactions.run(runner.manager, async () => {
          await lock(locks());
          await work(runner.manager);
        }),
      );
    }

    it('lets a user delete a document that a sync removes at the same time, without a deadlock', async () => {
      const location = await aLocation();
      const file = await anImportedFile(location);
      const deleteDocument = `DELETE FROM "sources" WHERE id = $1`;
      let userDeletion: Promise<void> | undefined;

      await withLocked(location, async (manager) => {
        ({ done: userDeletion } = await waitingForALock(deleteDocument, [
          file.sourceId,
        ]));
        await manager.query(deleteDocument, [file.sourceId]);
      });

      await expect(userDeletion).resolves.toBeUndefined();
    });

    it('lets a user delete a document while its replacement takes its place, without a deadlock', async () => {
      const location = await aLocation();
      const file = await anImportedFile(location);
      const replacement = await insert('sources');
      const deleteDocument = `DELETE FROM "sources" WHERE id = $1`;
      let userDeletion: Promise<void> | undefined;

      await withLocked(
        location,
        async (manager) => {
          ({ done: userDeletion } = await waitingForALock(deleteDocument, [
            file.sourceId,
          ]));
          await manager.query(deleteDocument, [file.sourceId]);
          await manager.query(
            `UPDATE "knowledge_base_synced_files" SET "sourceId" = $1 WHERE id = $2`,
            [replacement, file.id],
          );
        },
        (taken) => taken.lockFile(location, file.id, [replacement]),
      );

      await expect(userDeletion).resolves.toBeUndefined();
    });

    it('lets a user delete a document while its replacement, which sorts first, takes its place, without a deadlock', async () => {
      const location = await aLocation();
      const documentId = `f${randomUUID().slice(1)}`;
      const replacementId = `0${randomUUID().slice(1)}`;
      await db.query(`INSERT INTO "${schema}"."sources" ("id") VALUES ($1)`, [
        documentId,
      ]);
      await db.query(
        `INSERT INTO "${schema}"."sources" ("id", "replacesSourceId") VALUES ($1, $2)`,
        [replacementId, documentId],
      );
      const file = await anImportedFile(location, documentId as UUID);
      const user = await begin();
      const sync = await begin();
      const [{ pid: syncPid }] = (await sync.query(
        'SELECT pg_backend_pid() AS pid',
      )) as [{ pid: number }];

      // A user's delete locks the document, then its replacement (cascade).
      await user.query(`SELECT id FROM "sources" WHERE id = $1 FOR UPDATE`, [
        documentId,
      ]);
      const swap = commit(
        sync,
        transactions.run(sync.manager, () =>
          locks().lockFile(location, file.id, [replacementId as UUID]),
        ),
      );
      await untilWaitingForALock(syncPid);
      const userDeletion = commit(
        user,
        user.query(`DELETE FROM "sources" WHERE id = $1`, [documentId]),
      );

      await expect(userDeletion).resolves.toBeUndefined();
      await expect(swap).resolves.toBeUndefined();
    });

    it('lets the knowledge base be deleted while its location is removed, without a deadlock', async () => {
      const location = await aLocation();
      const sourceId = randomUUID();
      await db.query(
        `INSERT INTO "${schema}"."sources" ("id", "knowledgeBaseId") VALUES ($1, $2)`,
        [sourceId, location.knowledgeBaseId],
      );
      await anImportedFile(location, sourceId);
      let knowledgeBaseDeletion: Promise<void> | undefined;

      await withLocked(location, async (manager) => {
        ({ done: knowledgeBaseDeletion } = await waitingForALock(
          `DELETE FROM "knowledge_bases" WHERE id = $1`,
          [location.knowledgeBaseId],
        ));
        await manager.query(`DELETE FROM "sources" WHERE id = $1`, [sourceId]);
        await repository.delete(location.id);
      });

      await expect(knowledgeBaseDeletion).resolves.toBeUndefined();
    });
  });
});
