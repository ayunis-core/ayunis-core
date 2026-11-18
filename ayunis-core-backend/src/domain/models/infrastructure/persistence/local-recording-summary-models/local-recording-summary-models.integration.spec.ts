import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import type { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';
import { LocalRecordingSummaryModelsRepository } from './local-recording-summary-models.repository';
import { RecordingSummaryModelRecord } from './schema/recording-summary-model.record';

const summaryModelSchema = new EntitySchema<RecordingSummaryModelRecord>({
  name: 'RecordingSummaryModelRecord',
  target: RecordingSummaryModelRecord,
  tableName: 'recording_summary_models',
  columns: {
    id: { type: 'varchar', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    orgId: { type: 'varchar' },
    permittedModelId: { type: 'varchar' },
  },
});

/** Upserts against the real unique index: one selection per org. */
describe('LocalRecordingSummaryModelsRepository writes', () => {
  let db: DataSource;
  let schema: string;
  let repository: LocalRecordingSummaryModelsRepository;

  beforeAll(async () => {
    schema = `ayc1782_summary_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [summaryModelSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query(`CREATE TABLE "${schema}".recording_summary_models (
      id varchar PRIMARY KEY, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      "orgId" varchar NOT NULL, "permittedModelId" varchar NOT NULL)`);
    await db.query(
      `CREATE UNIQUE INDEX ON "${schema}".recording_summary_models ("orgId")`,
    );
    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    const txHost = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(db),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    repository = new LocalRecordingSummaryModelsRepository(
      db.getRepository(RecordingSummaryModelRecord),
      {} as PermittedModelMapper,
      txHost,
    );
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  const rowsOf = (orgId: UUID) =>
    db.getRepository(RecordingSummaryModelRecord).findBy({ orgId });

  it('replaces an org’s selection instead of adding a second row', async () => {
    const orgId = randomUUID();
    const replacement = randomUUID();

    await repository.set(orgId, randomUUID());
    await repository.set(orgId, replacement);

    const rows = await rowsOf(orgId);
    expect(rows).toHaveLength(1);
    expect(rows[0].permittedModelId).toBe(replacement);
  });

  it('keeps one row when admins of one org save at the same time', async () => {
    const orgId = randomUUID();

    await Promise.all([
      repository.set(orgId, randomUUID()),
      repository.set(orgId, randomUUID()),
      repository.set(orgId, randomUUID()),
    ]);

    expect(await rowsOf(orgId)).toHaveLength(1);
  });

  it('clears only the caller’s org', async () => {
    const orgId = randomUUID();
    const otherOrgId = randomUUID();
    const permitId = randomUUID();
    await repository.set(orgId, permitId);
    await repository.set(otherOrgId, permitId);

    await repository.clear(orgId);

    expect(await rowsOf(orgId)).toHaveLength(0);
    expect(await rowsOf(otherOrgId)).toHaveLength(1);
  });
});
