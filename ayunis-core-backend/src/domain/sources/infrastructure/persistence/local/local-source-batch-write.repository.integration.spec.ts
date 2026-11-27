import { randomUUID, type UUID } from 'crypto';
import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { LocalSourceBatchWriteRepository } from './local-source-batch-write.repository';

describe('LocalSourceBatchWriteRepository', () => {
  const schema = `ayc1635_sources_${randomUUID().replaceAll('-', '')}`;
  let db: DataSource;
  let repository: LocalSourceBatchWriteRepository;

  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      // The repository's SQL names its table without a schema.
      extra: {
        ...(typeormConfigRaw as PostgresConnectionOptions).extra,
        options: `-c search_path=${schema}`,
      },
      entities: [],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    // The column types of the migrated table: IDs are varchar, not uuid. The
    // replacement's foreign key as AddSyncedFileProcessing creates it.
    await db.query(
      `CREATE TABLE "${schema}"."sources" ("id" character varying PRIMARY KEY, "name" character varying NOT NULL, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "status" character varying, "knowledgeBaseId" character varying, "storageKey" character varying, "replacesSourceId" character varying REFERENCES "${schema}"."sources" ("id") ON DELETE CASCADE, "syncedLocationId" character varying, "url" character varying)`,
    );
    repository = new LocalSourceBatchWriteRepository(
      { manager: db.manager } as never,
      { tx: undefined } as never,
    );
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  it('renames several sources in one statement and leaves others alone', async () => {
    const [renamed, other, untouched] = [
      randomUUID(),
      randomUUID(),
      randomUUID(),
    ];
    await db.query(
      `INSERT INTO "${schema}"."sources" ("id", "name") VALUES ($1, 'Hundesteuer.pdf'), ($2, 'Gebühren.pdf'), ($3, 'Haushalt.xlsx')`,
      [renamed, other, untouched],
    );

    await repository.rename([
      { sourceId: renamed, name: 'Hundesteuersatzung 2024.pdf', url: null },
      {
        sourceId: other,
        name: "Gebühren (Stand '24).pdf",
        url: 'https://musterstadt.de/gebuehren.pdf',
      },
      { sourceId: randomUUID(), name: 'Gelöscht.pdf', url: null },
    ]);

    const rows = await db.query<
      { id: string; name: string; url: string | null }[]
    >(`SELECT "id", "name", "url" FROM "${schema}"."sources"`);
    expect(
      new Map(rows.map(({ id, name, url }) => [id, { name, url }])),
    ).toEqual(
      new Map([
        [renamed, { name: 'Hundesteuersatzung 2024.pdf', url: null }],
        [
          other,
          {
            name: "Gebühren (Stand '24).pdf",
            url: 'https://musterstadt.de/gebuehren.pdf',
          },
        ],
        [untouched, { name: 'Haushalt.xlsx', url: null }],
      ]),
    );
  });

  describe('replacements of changed files', () => {
    const knowledgeBaseId = randomUUID();
    const syncedLocationId = randomUUID();
    const CITATION_URL = 'https://musterstadt.de/hundesteuer.pdf';

    async function aSource(
      status: SourceStatus,
      replaces: UUID | null = null,
    ): Promise<UUID> {
      const id = randomUUID();
      await db.query(
        `INSERT INTO "${schema}"."sources" ("id", "name", "status", "knowledgeBaseId", "storageKey", "replacesSourceId", "syncedLocationId", "url") VALUES ($1, 'Hundesteuer.pdf', $2, $3, $4, $5, $6, $7)`,
        [
          id,
          status,
          replaces ? null : knowledgeBaseId,
          `org/synced/${id}/Hundesteuer.pdf`,
          replaces,
          replaces ? null : syncedLocationId,
          replaces ? null : CITATION_URL,
        ],
      );
      return id;
    }

    async function row(id: UUID) {
      const [found] = await db.query<
        {
          name: string;
          knowledgeBaseId: string | null;
          syncedLocationId: string | null;
          url: string | null;
        }[]
      >(
        `SELECT "name", "knowledgeBaseId", "syncedLocationId", "url" FROM "${schema}"."sources" WHERE id = $1`,
        [id],
      );
      return found ?? null;
    }

    it('keeps a replacement out of the knowledge base until it is indexed, then gives it the place of the source it replaces', async () => {
      const replaced = await aSource(SourceStatus.READY);
      const replacement = await aSource(SourceStatus.PROCESSING, replaced);

      expect(
        await repository.moveReplacementIn(replacement, 'Hundesteuer 2025.pdf'),
      ).toBeNull();
      expect(await row(replacement)).toMatchObject({ knowledgeBaseId: null });

      await db.query(
        `UPDATE "${schema}"."sources" SET "status" = $2 WHERE id = $1`,
        [replacement, SourceStatus.READY],
      );
      expect(
        await repository.moveReplacementIn(replacement, 'Hundesteuer 2025.pdf'),
      ).toEqual({
        id: replaced,
        storageKey: `org/synced/${replaced}/Hundesteuer.pdf`,
      });
      // It stays listed under the location the replaced source belonged to,
      // cited at its URL as it is now.
      expect(await row(replacement)).toEqual({
        name: 'Hundesteuer 2025.pdf',
        knowledgeBaseId,
        syncedLocationId,
        url: CITATION_URL,
      });
      await db.query(`DELETE FROM "${schema}"."sources" WHERE id = $1`, [
        replaced,
      ]);
      expect(await row(replacement)).not.toBeNull();
    });

    it('lets a failed replacement take the place only of a source without an indexed version', async () => {
      const indexed = await aSource(SourceStatus.READY);
      const failedBesideIndexed = await aSource(SourceStatus.FAILED, indexed);
      const neverIndexed = await aSource(SourceStatus.PROCESSING);
      const failedBesideNone = await aSource(SourceStatus.FAILED, neverIndexed);

      expect(
        await repository.moveReplacementIn(failedBesideIndexed, 'a.pdf'),
      ).toBeNull();
      expect(
        await repository.moveReplacementIn(failedBesideNone, 'b.pdf'),
      ).toMatchObject({ id: neverIndexed });
    });

    it('deletes a replacement with the source it replaces', async () => {
      const replaced = await aSource(SourceStatus.READY);
      const replacement = await aSource(SourceStatus.PROCESSING, replaced);

      await db.query(`DELETE FROM "${schema}"."sources" WHERE id = $1`, [
        replaced,
      ]);

      expect(await row(replacement)).toBeNull();
    });
  });
});
