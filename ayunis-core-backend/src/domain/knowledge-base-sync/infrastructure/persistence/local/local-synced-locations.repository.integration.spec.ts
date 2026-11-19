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
import { SyncedLocationLocks } from 'src/domain/knowledge-base-sync/application/services/synced-location-locks.service';
import { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { SyncedFileState } from 'src/domain/knowledge-base-sync/domain/synced-file-state.enum';
import { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import { SyncedLocationState } from 'src/domain/knowledge-base-sync/domain/synced-location-state.enum';
import { LockSourcesUseCase } from 'src/domain/sources/application/use-cases/lock-sources/lock-sources.use-case';
import { LocalSourceBatchWriteRepository } from 'src/domain/sources/infrastructure/persistence/local/local-source-batch-write.repository';
import { LocalSyncedLocationsRepository } from './local-synced-locations.repository';
import { SyncedFileMapper } from './mappers/synced-file.mapper';
import { SyncedLocationMapper } from './mappers/synced-location.mapper';
import { SyncedFileRecord } from './schema/synced-file.record';
import { SyncedLocationRecord } from './schema/synced-location.record';

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
  columns: {
    id: { type: String, primary: true },
    ...timestamps,
    orgId: { type: String },
    knowledgeBaseId: { type: String },
    connectorId: { type: String },
    location: { type: String },
    cursor: { type: String, nullable: true },
    state: { type: String },
    lastSyncedAt: { type: 'timestamp', nullable: true },
  },
});
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
      entities: [locationSchema, fileSchema],
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

  async function aLocation() {
    const location = new SyncedLocation({
      orgId: await insert('orgs'),
      knowledgeBaseId: await insert('knowledge_bases'),
      connectorId: await insert('connectors'),
      location: 'https://municipality.sharepoint.com/sites/bauamt',
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

  it('keeps one location per knowledge base, connector and URL', async () => {
    const location = await aLocation();

    expect(
      await repository.create(
        new SyncedLocation({ ...location, id: randomUUID() }),
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
      for (let attempt = 0; attempt < 250; attempt++) {
        const [activity] = await db.query(
          'SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1',
          [pid],
        );
        if (activity.wait_event_type === 'Lock') return { done };
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error(`"${sql}" never waited for a lock`);
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
