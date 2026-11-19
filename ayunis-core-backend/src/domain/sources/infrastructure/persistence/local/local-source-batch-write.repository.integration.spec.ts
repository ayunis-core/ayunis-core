import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
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
    // The column types of the migrated table: IDs are varchar, not uuid.
    await db.query(
      `CREATE TABLE "${schema}"."sources" ("id" character varying PRIMARY KEY, "name" character varying NOT NULL, "updatedAt" TIMESTAMP NOT NULL DEFAULT now())`,
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
      { sourceId: renamed, name: 'Hundesteuersatzung 2024.pdf' },
      { sourceId: other, name: "Gebühren (Stand '24).pdf" },
      { sourceId: randomUUID(), name: 'Gelöscht.pdf' },
    ]);

    const rows = await db.query<{ id: string; name: string }[]>(
      `SELECT "id", "name" FROM "${schema}"."sources"`,
    );
    expect(new Map(rows.map((row) => [row.id, row.name]))).toEqual(
      new Map([
        [renamed, 'Hundesteuersatzung 2024.pdf'],
        [other, "Gebühren (Stand '24).pdf"],
        [untouched, 'Haushalt.xlsx'],
      ]),
    );
  });
});
