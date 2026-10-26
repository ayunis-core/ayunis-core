import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import type { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';
import { LocalDefaultModelSelectionsRepository } from './local-default-model-selections.repository';
import { DefaultModelSelectionRecord } from './schema/default-model-selection.record';
import { PermittedModelRecord } from 'src/domain/models/infrastructure/persistence/local-permitted-models/schema/permitted-model.record';

const selectionSchema = new EntitySchema<DefaultModelSelectionRecord>({
  name: 'DefaultModelSelectionRecord',
  target: DefaultModelSelectionRecord,
  tableName: 'default_model_selections',
  columns: {
    id: { type: 'varchar', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    userId: { type: 'varchar', nullable: true },
    teamId: { type: 'varchar', nullable: true },
    orgId: { type: 'varchar', nullable: true },
    kind: { type: 'varchar' },
    permittedModelId: { type: 'varchar', nullable: true },
    mode: { type: 'varchar', nullable: true },
  },
});

const permitSchema = new EntitySchema<PermittedModelRecord>({
  name: 'PermittedModelRecord',
  target: PermittedModelRecord,
  tableName: 'permitted_models',
  columns: {
    id: { type: 'varchar', primary: true },
    modelId: { type: 'varchar' },
  },
});

/** Upserts against the real constraints: one row per owner, kind/permit pairing. */
describe('LocalDefaultModelSelectionsRepository writes', () => {
  let db: DataSource;
  let schema: string;
  let repository: LocalDefaultModelSelectionsRepository;

  beforeAll(async () => {
    schema = `ayc441_defaults_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [selectionSchema, permitSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query(
      `CREATE TABLE "${schema}".permitted_models (id varchar PRIMARY KEY, "modelId" varchar NOT NULL)`,
    );
    await db.query(`CREATE TABLE "${schema}".default_model_selections (
      id varchar PRIMARY KEY, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(),
      "userId" varchar, "teamId" varchar, "orgId" varchar, kind varchar NOT NULL, "permittedModelId" varchar, mode varchar,
      CHECK (num_nonnulls("userId", "teamId", "orgId") = 1),
      CHECK ((kind = 'model') = ("permittedModelId" IS NOT NULL)),
      CHECK ((kind = 'mode') = (mode IS NOT NULL)))`);
    for (const owner of ['userId', 'teamId', 'orgId']) {
      await db.query(
        `CREATE UNIQUE INDEX ON "${schema}".default_model_selections ("${owner}") WHERE "${owner}" IS NOT NULL`,
      );
    }
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
    repository = new LocalDefaultModelSelectionsRepository(
      db.getRepository(DefaultModelSelectionRecord),
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
    db.getRepository(DefaultModelSelectionRecord).findBy({ orgId });

  it('switches one owner between a model and a mode without a second row', async () => {
    const orgId = randomUUID();
    const permitId = randomUUID();

    await repository.setModel({ orgId }, permitId);
    await repository.setMode({ orgId }, ModelMode.MAX);
    let rows = await rowsOf(orgId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'mode',
      mode: 'max',
      permittedModelId: null,
    });

    await repository.setModel({ orgId }, permitId);
    rows = await rowsOf(orgId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'model',
      permittedModelId: permitId,
      mode: null,
    });
  });

  it('keeps one row when writes for the same owner race', async () => {
    const orgId = randomUUID();

    await Promise.all([
      repository.setMode({ orgId }, ModelMode.AUTO),
      repository.setModel({ orgId }, randomUUID()),
      repository.setMode({ orgId }, ModelMode.MAX),
    ]);

    expect(await rowsOf(orgId)).toHaveLength(1);
  });

  it('keeps owners apart: a user default does not replace the org default', async () => {
    const orgId = randomUUID();
    const userId = randomUUID();

    await repository.setMode({ orgId }, ModelMode.AUTO);
    await repository.setModel({ userId }, randomUUID());

    expect(await rowsOf(orgId)).toHaveLength(1);
    expect(
      await db.getRepository(DefaultModelSelectionRecord).countBy({ userId }),
    ).toBe(1);
  });

  it('clears an owner and removes defaults by catalog model', async () => {
    const orgId = randomUUID();
    const userId = randomUUID();
    const catalogModelId = randomUUID();
    const permitId = randomUUID();
    await db.query(
      `INSERT INTO "${schema}".permitted_models (id, "modelId") VALUES ($1, $2)`,
      [permitId, catalogModelId],
    );
    await repository.setModel({ orgId }, permitId);
    await repository.setModel({ userId }, permitId);

    await repository.clear({ orgId });
    expect(await rowsOf(orgId)).toHaveLength(0);

    await repository.deleteByCatalogModelId(catalogModelId);
    expect(
      await db.getRepository(DefaultModelSelectionRecord).countBy({ userId }),
    ).toBe(0);
  });
});
