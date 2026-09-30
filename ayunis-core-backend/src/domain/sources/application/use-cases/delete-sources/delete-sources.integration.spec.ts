import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { LocalSourceRepository } from 'src/domain/sources/infrastructure/persistence/local/local-source.repository';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import type { SourceMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source.mapper';
import type { SourceContentChunkMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source-content-chunk.mapper';
import { ParentChildIndexerRepository } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/parent-child-index.repository';
import { ParentChunkRecord } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/infrastructure/persistence/schema/parent-chunk.record';
import { ParentChildIndexerMapper } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/infrastructure/persistence/mappers/parent-child-indexer.mapper';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';
import type { IndexerPort } from 'src/domain/rag/indexers/application/ports/indexer';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import type { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { DeleteSourcesUseCase } from './delete-sources.use-case';
import { DeleteSourcesCommand } from './delete-sources.command';

const sourceSchema = new EntitySchema<SourceRecord>({
  name: 'SourceRecord',
  target: SourceRecord,
  tableName: 'sources',
  columns: { id: { type: 'uuid', primary: true } },
});
const parentSchema = new EntitySchema<ParentChunkRecord>({
  name: 'ParentChunkRecord',
  target: ParentChunkRecord,
  tableName: 'parent_chunks',
  columns: {
    id: { type: 'uuid', primary: true },
    relatedDocumentId: { type: 'uuid' },
  },
});

describe('DeleteSourcesUseCase database atomicity', () => {
  let db: DataSource;
  let schema: string;
  let sources: LocalSourceRepository;
  let useCase: DeleteSourcesUseCase;
  let sourceId: ReturnType<typeof randomUUID>;

  beforeAll(async () => {
    schema = `ayc496_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [sourceSchema, parentSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    await configureUseCase();
  });

  async function configureUseCase(): Promise<void> {
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
    const module = await Test.createTestingModule({
      providers: [
        ParentChildIndexerRepository,
        ParentChildIndexerMapper,
        {
          provide: getRepositoryToken(ParentChunkRecord),
          useValue: db.getRepository(ParentChunkRecord),
        },
        { provide: TransactionHost, useValue: txHost },
      ],
    }).compile();
    const index = module.get(ParentChildIndexerRepository);
    sources = new LocalSourceRepository(
      db.getRepository(SourceRecord),
      {} as SourceMapper,
      {} as SourceContentChunkMapper,
      txHost,
    );
    const registry = new IndexRegistry();
    registry.register(IndexType.PARENT_CHILD, {
      deleteMany: (ids) => index.deleteMany(ids),
    } as IndexerPort);
    useCase = new DeleteSourcesUseCase(
      registry,
      sources,
      {} as CleanupSourceProcessingUseCase,
    );
  }

  beforeEach(async () => {
    sourceId = randomUUID();
    await db.getRepository(SourceRecord).insert({ id: sourceId });
    await db
      .getRepository(ParentChunkRecord)
      .insert({ id: randomUUID(), relatedDocumentId: sourceId });
    // Processing discovery is independent of the database writes under test.
    jest.spyOn(sources, 'findByIds').mockResolvedValue([]);
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });

  async function remainingRows(): Promise<number[]> {
    return Promise.all([
      db.getRepository(SourceRecord).countBy({ id: sourceId }),
      db
        .getRepository(ParentChunkRecord)
        .countBy({ relatedDocumentId: sourceId }),
    ]);
  }

  it('preserves index and source rows when source deletion fails', async () => {
    jest
      .spyOn(sources, 'deleteMany')
      .mockRejectedValue(new Error('source delete failed'));
    await expect(
      useCase.execute(new DeleteSourcesCommand([sourceId], randomUUID())),
    ).rejects.toThrow();
    expect(await remainingRows()).toEqual([1, 1]);
  });

  it('rolls back both completed deletes when a later operation fails', async () => {
    const deleteMany = sources.deleteMany.bind(sources);
    jest.spyOn(sources, 'deleteMany').mockImplementation(async (ids) => {
      await deleteMany(ids);
      throw new Error('failure after source delete');
    });
    await expect(
      useCase.execute(new DeleteSourcesCommand([sourceId], randomUUID())),
    ).rejects.toThrow();
    expect(await remainingRows()).toEqual([1, 1]);
  });

  it('commits deletion and does not resurrect old index rows after recreation', async () => {
    await useCase.execute(new DeleteSourcesCommand([sourceId], randomUUID()));
    expect(await remainingRows()).toEqual([0, 0]);
    await db.getRepository(SourceRecord).insert({ id: sourceId });
    expect(await remainingRows()).toEqual([1, 0]);
  });

  it('leaves existing rows intact for an empty deletion', async () => {
    await useCase.execute(new DeleteSourcesCommand([], randomUUID()));
    expect(await remainingRows()).toEqual([1, 1]);
  });
});
