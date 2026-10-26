import { randomUUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { LocalThreadsRepository } from 'src/domain/threads/infrastructure/persistence/local/local-threads.repository';
import { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import type { ThreadMapper } from 'src/domain/threads/infrastructure/persistence/local/mappers/thread.mapper';
import type { LocalThreadAssignmentsRepository } from 'src/domain/threads/infrastructure/persistence/local/local-thread-assignments.repository';
import { LocalDefaultModelSelectionsRepository } from 'src/domain/models/infrastructure/persistence/local-default-model-selections/local-default-model-selections.repository';
import {
  DefaultModelSelectionKind,
  DefaultModelSelectionRecord,
} from 'src/domain/models/infrastructure/persistence/local-default-model-selections/schema/default-model-selection.record';
import { LocalPermittedModelsRepository } from './local-permitted-models.repository';
import { PermittedModelRecord } from './schema/permitted-model.record';
import type { PermittedModelMapper } from './mappers/permitted-model.mapper';
import type { PermittedModelFinder } from './permitted-model-finder';

const modelSchema = new EntitySchema<PermittedModelRecord>({
  name: 'PermittedModelRecord',
  target: PermittedModelRecord,
  tableName: 'models',
  columns: { id: { type: 'uuid', primary: true }, orgId: { type: 'uuid' } },
});
const defaultSchema = new EntitySchema<DefaultModelSelectionRecord>({
  name: 'DefaultModelSelectionRecord',
  target: DefaultModelSelectionRecord,
  tableName: 'defaults',
  columns: {
    id: { type: 'uuid', primary: true },
    userId: { type: 'uuid', nullable: true },
    kind: { type: 'varchar' },
    permittedModelId: { type: 'uuid', nullable: true },
  },
});
const threadSchema = new EntitySchema<ThreadRecord>({
  name: 'ThreadRecord',
  target: ThreadRecord,
  tableName: 'threads',
  columns: {
    id: { type: 'uuid', primary: true },
    userId: { type: 'uuid' },
    modelId: { type: 'uuid' },
  },
});

describe('Model deletion transaction across repositories', () => {
  let db: DataSource;
  let schema: string;
  let txHost: TransactionHost<TransactionalAdapterTypeOrm>;
  let models: LocalPermittedModelsRepository;
  let defaults: LocalDefaultModelSelectionsRepository;
  let threads: LocalThreadsRepository;
  const orgId = randomUUID();
  const userId = randomUUID();
  let modelId: ReturnType<typeof randomUUID>;
  let replacementId: ReturnType<typeof randomUUID>;
  let threadId: ReturnType<typeof randomUUID>;

  beforeAll(async () => {
    schema = `ayc496_models_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [modelSchema, defaultSchema, threadSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    configureRepositories();
  }, 30_000);

  function configureRepositories(): void {
    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    txHost = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(db),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    models = new LocalPermittedModelsRepository(
      db.getRepository(PermittedModelRecord),
      {} as PermittedModelMapper,
      {} as PermittedModelFinder,
      txHost,
    );
    defaults = new LocalDefaultModelSelectionsRepository(
      db.getRepository(DefaultModelSelectionRecord),
      {} as PermittedModelMapper,
      txHost,
    );
    threads = new LocalThreadsRepository(
      db.getRepository(ThreadRecord),
      {} as ThreadMapper,
      {} as LocalThreadAssignmentsRepository,
      txHost,
    );
  }

  beforeEach(async () => {
    modelId = randomUUID();
    replacementId = randomUUID();
    threadId = randomUUID();
    await db.getRepository(PermittedModelRecord).insert([
      { id: modelId, orgId },
      { id: replacementId, orgId },
    ]);
    await db.getRepository(DefaultModelSelectionRecord).insert({
      id: randomUUID(),
      userId,
      kind: DefaultModelSelectionKind.MODEL,
      permittedModelId: modelId,
    });
    await db
      .getRepository(ThreadRecord)
      .insert({ id: threadId, userId, modelId });
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  }, 30_000);

  async function deleteAndReplace(): Promise<void> {
    await defaults.deleteByPermittedModelIds([modelId]);
    await threads.updateModel({
      threadId,
      userId,
      permittedModelId: replacementId,
    });
    await models.delete({ id: modelId, orgId });
  }

  it('restores defaults, thread model, and model row when the operation fails', async () => {
    await expect(
      txHost.withTransaction(async () => {
        await deleteAndReplace();
        throw new Error('deletion failed');
      }),
    ).rejects.toThrow('deletion failed');
    expect(
      await db.getRepository(PermittedModelRecord).countBy({ id: modelId }),
    ).toBe(1);
    expect(
      await db
        .getRepository(DefaultModelSelectionRecord)
        .countBy({ permittedModelId: modelId }),
    ).toBe(1);
    expect(
      await db.getRepository(ThreadRecord).findOneBy({ id: threadId }),
    ).toMatchObject({ modelId });
  });

  it('commits the model replacement and dependent default removal together', async () => {
    await txHost.withTransaction(deleteAndReplace);
    expect(
      await db.getRepository(PermittedModelRecord).countBy({ id: modelId }),
    ).toBe(0);
    expect(
      await db
        .getRepository(DefaultModelSelectionRecord)
        .countBy({ permittedModelId: modelId }),
    ).toBe(0);
    expect(
      await db.getRepository(ThreadRecord).findOneBy({ id: threadId }),
    ).toMatchObject({ modelId: replacementId });
  });
});
