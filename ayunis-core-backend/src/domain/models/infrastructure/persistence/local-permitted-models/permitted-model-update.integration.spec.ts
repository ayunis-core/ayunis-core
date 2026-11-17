import { randomUUID, type UUID } from 'crypto';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { LocalPermittedModelsRepository } from './local-permitted-models.repository';
import { PermittedModelRecord } from './schema/permitted-model.record';
import type { PermittedModelFinder } from './permitted-model-finder';

const catalogModelSchema = new EntitySchema<{ id: UUID }>({
  name: 'CatalogModel',
  tableName: 'models',
  columns: { id: { type: 'uuid', primary: true } },
});

const permittedModelSchema = new EntitySchema<PermittedModelRecord>({
  name: 'PermittedModelRecord',
  target: PermittedModelRecord,
  tableName: 'permitted_models',
  columns: {
    id: { type: 'uuid', primary: true },
    orgId: { type: 'uuid' },
    modelId: { type: 'uuid' },
    anonymousOnly: { type: 'boolean', default: false },
    memoryAccess: { type: 'boolean', default: false },
  },
  relations: {
    model: {
      type: 'many-to-one',
      target: 'CatalogModel',
      joinColumn: { name: 'modelId' },
    },
  },
});

describe('Permitted model policy update', () => {
  let db: DataSource;
  let schema: string;
  let repository: LocalPermittedModelsRepository;

  const storedPolicy = async (id: UUID) => {
    const { anonymousOnly, memoryAccess } = await db
      .getRepository(PermittedModelRecord)
      .findOneByOrFail({ id });
    return { anonymousOnly, memoryAccess };
  };

  async function aGrant(policy: {
    anonymousOnly: boolean;
    memoryAccess: boolean;
  }): Promise<{ id: UUID; orgId: UUID }> {
    const grant = { id: randomUUID(), orgId: randomUUID() };
    const modelId = randomUUID();
    await db.getRepository('CatalogModel').insert({ id: modelId });
    await db
      .getRepository(PermittedModelRecord)
      .insert({ ...grant, modelId, ...policy });
    return grant;
  }

  beforeAll(async () => {
    schema = `ayc1819_permitted_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [catalogModelSchema, permittedModelSchema],
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
      { toDomain: (record: PermittedModelRecord) => record } as never,
      {} as PermittedModelFinder,
      {} as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  }, 30_000);

  it('turning memory access on keeps enforced anonymous mode', async () => {
    const grant = await aGrant({ anonymousOnly: true, memoryAccess: false });

    await repository.update({ ...grant, policy: { memoryAccess: true } });

    expect(await storedPolicy(grant.id)).toEqual({
      anonymousOnly: true,
      memoryAccess: true,
    });
  });

  it('turning anonymous mode off keeps memory access', async () => {
    const grant = await aGrant({ anonymousOnly: true, memoryAccess: true });

    await repository.update({ ...grant, policy: { anonymousOnly: false } });

    expect(await storedPolicy(grant.id)).toEqual({
      anonymousOnly: false,
      memoryAccess: true,
    });
  });

  // Two quick clicks on different switches arrive as concurrent requests.
  it('keeps both switches when they are changed concurrently', async () => {
    const grant = await aGrant({ anonymousOnly: false, memoryAccess: false });

    await Promise.all([
      repository.update({ ...grant, policy: { anonymousOnly: true } }),
      repository.update({ ...grant, policy: { memoryAccess: true } }),
    ]);

    expect(await storedPolicy(grant.id)).toEqual({
      anonymousOnly: true,
      memoryAccess: true,
    });
  });

  it('does not touch a grant of another organization', async () => {
    const grant = await aGrant({ anonymousOnly: false, memoryAccess: false });

    await expect(
      repository.update({
        id: grant.id,
        orgId: randomUUID(),
        policy: { memoryAccess: true },
      }),
    ).rejects.toThrow();
    expect(await storedPolicy(grant.id)).toEqual({
      anonymousOnly: false,
      memoryAccess: false,
    });
  });
});
