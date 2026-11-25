import { randomUUID } from 'crypto';
import { DataSource, EntitySchema, type QueryRunner } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { CreateOparlMirrorTables1795478677149 } from 'src/db/migrations/1795478677149-CreateOparlMirrorTables';
import { OparlSystem } from 'src/domain/oparl/domain/oparl-system.entity';
import { PostgresOparlSystemsRepository } from './postgres-oparl-systems.repository';
import { OparlSystemRecord } from './schema/oparl-system.record';

const HOUR = 60 * 60 * 1000;

// ts-jest drops the column types of the records, so the table is declared
// explicitly; the real migration creates it.
const text = { type: 'text', nullable: true } as const;
const timestamptz = { type: 'timestamptz', nullable: true } as const;
const systemSchema = new EntitySchema<OparlSystemRecord>({
  name: 'OparlSystemRecord',
  target: OparlSystemRecord,
  tableName: 'oparl_systems',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    url: { type: 'text' },
    oparlId: { type: 'text' },
    name: text,
    vendor: text,
    product: text,
    oparlVersion: text,
    website: text,
    raw: { type: 'jsonb' },
    nextSyncAt: { type: 'timestamptz' },
    lastDeltaSyncAt: timestamptz,
    lastFullSyncAt: timestamptz,
    lastRunStatus: text,
    lastRunFinishedAt: timestamptz,
    lastError: text,
    consecutiveFailures: { type: 'integer' },
  },
});

describe('PostgresOparlSystemsRepository', () => {
  const schema = `ayc2058_systems_${randomUUID().replaceAll('-', '')}`;
  let db: DataSource;
  let systems: PostgresOparlSystemsRepository;

  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      entities: [systemSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
      extra: { options: `-c search_path=${schema}` },
    });
    await db.initialize();
    const setup = db.createQueryRunner();
    await setup.createSchema(schema, true);
    // The migration names its enum types in "public"; keep them in the schema.
    await new CreateOparlMirrorTables1795478677149().up({
      query: (sql: string) =>
        setup.query(sql.replaceAll('"public".', `"${schema}".`)),
    } as QueryRunner);
    await setup.release();
    systems = new PostgresOparlSystemsRepository(
      db.getRepository(OparlSystemRecord),
      { tx: undefined } as never,
    );
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  const aSystem = (nextSyncAt: Date) => {
    const url = `https://ris.example.de/${randomUUID()}/oparl/system`;
    return new OparlSystem({
      url,
      oparlId: url,
      name: null,
      vendor: null,
      product: null,
      oparlVersion: null,
      website: null,
      raw: {},
      nextSyncAt,
    });
  };

  it('claims each due system once and moves it to the lease end', async () => {
    const now = new Date();
    const due = aSystem(new Date(now.getTime() - HOUR));
    const later = aSystem(new Date(now.getTime() + HOUR));
    await systems.createIfAbsent(due);
    await systems.createIfAbsent(later);
    const leaseUntil = new Date(now.getTime() + 6 * HOUR);

    expect(await systems.claimDue(now, leaseUntil, 100)).toEqual([due.id]);
    expect((await systems.findById(due.id))?.nextSyncAt).toEqual(leaseUntil);
    expect(await systems.claimDue(now, leaseUntil, 100)).toEqual([]);
  });

  it('refuses a second system under the same URL or OParl ID', async () => {
    const system = aSystem(new Date());
    expect(await systems.createIfAbsent(system)).toBe(true);

    const sameUrl = new OparlSystem({ ...system, id: undefined, oparlId: 'x' });
    const sameId = new OparlSystem({
      ...system,
      id: undefined,
      url: `${system.url}/other`,
    });
    expect(await systems.createIfAbsent(sameUrl)).toBe(false);
    expect(await systems.createIfAbsent(sameId)).toBe(false);
  });
});
