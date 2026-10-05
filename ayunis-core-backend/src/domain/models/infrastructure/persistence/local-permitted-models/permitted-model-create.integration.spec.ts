import { randomUUID, type UUID } from 'crypto';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { DuplicatePermittedModelError } from 'src/domain/models/application/models.errors';
import type { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { LocalPermittedModelsRepository } from './local-permitted-models.repository';
import { PermittedModelRecord } from './schema/permitted-model.record';
import type { PermittedModelMapper } from './mappers/permitted-model.mapper';
import type { PermittedModelFinder } from './permitted-model-finder';

const permittedModelSchema = new EntitySchema<PermittedModelRecord>({
  name: 'PermittedModelRecord',
  target: PermittedModelRecord,
  tableName: 'permitted_models',
  columns: {
    id: { type: 'uuid', primary: true },
    orgId: { type: 'uuid' },
    modelId: { type: 'uuid' },
    scope: { type: 'varchar' },
  },
  indices: [
    { columns: ['orgId', 'modelId'], unique: true, where: `"scope" = 'org'` },
  ],
});

const mapper = {
  toRecord: (permittedModel: PermittedModel) =>
    Object.assign(new PermittedModelRecord(), {
      id: randomUUID(),
      orgId: permittedModel.orgId,
      modelId: permittedModel.model.id,
      scope: PermittedModelScope.ORG,
    }),
  toDomain: (record: PermittedModelRecord) => record,
} as unknown as PermittedModelMapper;

describe('Org-scoped permitted model creation', () => {
  let db: DataSource;
  let schema: string;
  let repository: LocalPermittedModelsRepository;

  const grant = (orgId: UUID, modelId: UUID) =>
    ({ orgId, model: { id: modelId } }) as PermittedModel;

  const countGrants = (orgId: UUID, modelId: UUID) =>
    db.getRepository(PermittedModelRecord).countBy({ orgId, modelId });

  beforeAll(async () => {
    schema = `ayc1110_permitted_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [permittedModelSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    repository = new LocalPermittedModelsRepository(
      db.getRepository(PermittedModelRecord),
      mapper,
      {} as PermittedModelFinder,
      {} as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });

  it('rejects a repeated grant with a typed conflict and keeps one row', async () => {
    const orgId = randomUUID();
    const modelId = randomUUID();

    await repository.create(grant(orgId, modelId));

    await expect(repository.create(grant(orgId, modelId))).rejects.toThrow(
      DuplicatePermittedModelError,
    );
    expect(await countGrants(orgId, modelId)).toBe(1);
  });

  it('lets exactly one of several concurrent grants win', async () => {
    const orgId = randomUUID();
    const modelId = randomUUID();

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => repository.create(grant(orgId, modelId))),
    );

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(rejected).toHaveLength(4);
    for (const result of rejected) {
      expect(result.reason).toBeInstanceOf(DuplicatePermittedModelError);
    }
    expect(await countGrants(orgId, modelId)).toBe(1);
  });

  it('allows the same model to be granted to different orgs', async () => {
    const modelId = randomUUID();

    await repository.create(grant(randomUUID(), modelId));
    await repository.create(grant(randomUUID(), modelId));

    expect(
      await db.getRepository(PermittedModelRecord).countBy({ modelId }),
    ).toBe(2);
  });
});
