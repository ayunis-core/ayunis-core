import { randomUUID, type UUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
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
import type { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import type { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { DeleteFailedKnowledgeBaseSourcesUseCase } from './delete-failed-knowledge-base-sources.use-case';
import { DeleteFailedKnowledgeBaseSourcesCommand } from './delete-failed-knowledge-base-sources.command';

const sourceSchema = new EntitySchema<SourceRecord>({
  name: 'SourceRecord',
  target: SourceRecord,
  tableName: 'sources',
  columns: {
    id: { type: 'uuid', primary: true },
    status: { type: 'varchar' },
    knowledgeBaseId: { type: 'uuid', nullable: true },
    storageKey: { type: 'varchar', nullable: true },
  },
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

const ORG_ID = randomUUID();
const byId = (a: string, b: string) => a.localeCompare(b);

describe('DeleteFailedKnowledgeBaseSourcesUseCase against PostgreSQL', () => {
  let db: DataSource;
  let schema: string;
  let sources: LocalSourceRepository;
  let index: ParentChildIndexerRepository;
  let cleanup: { execute: jest.Mock };
  let useCase: DeleteFailedKnowledgeBaseSourcesUseCase;

  beforeAll(async () => {
    schema = `ayc1638_${randomUUID().replaceAll('-', '')}`;
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
  }, 30_000);

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
    index = module.get(ParentChildIndexerRepository);
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
    cleanup = { execute: jest.fn().mockResolvedValue(undefined) };
    useCase = new DeleteFailedKnowledgeBaseSourcesUseCase(
      registry,
      sources,
      cleanup as unknown as CleanupSourceProcessingUseCase,
      txHost,
    );
  }

  afterEach(() => {
    jest.restoreAllMocks();
    cleanup.execute.mockClear();
  });
  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  }, 30_000);

  async function insertSource(
    knowledgeBaseId: UUID | null,
    status: SourceStatus,
    storageKey: string | null = null,
  ): Promise<UUID> {
    const id = randomUUID();
    await db
      .getRepository(SourceRecord)
      .insert({ id, status, knowledgeBaseId, storageKey });
    await db
      .getRepository(ParentChunkRecord)
      .insert({ id: randomUUID(), relatedDocumentId: id });
    return id;
  }

  async function remaining(ids: UUID[]): Promise<UUID[]> {
    const rows = await db
      .getRepository(SourceRecord)
      .createQueryBuilder('s')
      .select('s.id', 'id')
      .where('s.id IN (:...ids)', { ids })
      .getRawMany<{ id: UUID }>();
    return rows.map((row) => row.id).sort(byId);
  }

  async function indexedDocuments(ids: UUID[]): Promise<UUID[]> {
    const rows = await db
      .getRepository(ParentChunkRecord)
      .createQueryBuilder('c')
      .select('c.relatedDocumentId', 'id')
      .where('c.relatedDocumentId IN (:...ids)', { ids })
      .getRawMany<{ id: UUID }>();
    return rows.map((row) => row.id).sort(byId);
  }

  function command(knowledgeBaseId: UUID) {
    return new DeleteFailedKnowledgeBaseSourcesCommand(knowledgeBaseId, ORG_ID);
  }

  it('removes only failed sources of the knowledge base and their index entries', async () => {
    const knowledgeBaseId = randomUUID();
    const failed = await insertSource(knowledgeBaseId, SourceStatus.FAILED);
    const processing = await insertSource(
      knowledgeBaseId,
      SourceStatus.PROCESSING,
    );
    const ready = await insertSource(knowledgeBaseId, SourceStatus.READY);
    const otherKnowledgeBase = await insertSource(
      randomUUID(),
      SourceStatus.FAILED,
    );
    const threadUpload = await insertSource(null, SourceStatus.FAILED);
    const all = [failed, processing, ready, otherKnowledgeBase, threadUpload];

    await expect(useCase.execute(command(knowledgeBaseId))).resolves.toEqual([
      failed,
    ]);

    const kept = [processing, ready, otherKnowledgeBase, threadUpload].sort(
      byId,
    );
    expect(await remaining(all)).toEqual(kept);
    expect(await indexedDocuments(all)).toEqual(kept);
  });

  it('releases the processing files and originals of removed sources after commit', async () => {
    const knowledgeBaseId = randomUUID();
    const storageKey = `${ORG_ID}/uploads/session/budget.xlsx`;
    const failed = await insertSource(
      knowledgeBaseId,
      SourceStatus.FAILED,
      storageKey,
    );
    await insertSource(knowledgeBaseId, SourceStatus.READY, 'kept/original');

    await useCase.execute(command(knowledgeBaseId));

    const cleanupCommand = cleanup.execute.mock
      .calls[0][0] as CleanupSourceProcessingCommand;
    expect(cleanupCommand).toMatchObject({
      sourceIds: [failed],
      orgId: ORG_ID,
      storageKeys: [storageKey],
    });
  });

  it('changes nothing when the knowledge base has no failed sources', async () => {
    const knowledgeBaseId = randomUUID();
    const ready = await insertSource(knowledgeBaseId, SourceStatus.READY);

    await expect(useCase.execute(command(knowledgeBaseId))).resolves.toEqual(
      [],
    );

    expect(await remaining([ready])).toEqual([ready]);
    expect(cleanup.execute).not.toHaveBeenCalled();
  });

  it('keeps source and index rows when removing the index entries fails', async () => {
    const knowledgeBaseId = randomUUID();
    const failed = await insertSource(knowledgeBaseId, SourceStatus.FAILED);
    jest
      .spyOn(index, 'deleteMany')
      .mockRejectedValue(new Error('index delete failed'));

    await expect(useCase.execute(command(knowledgeBaseId))).rejects.toThrow();

    expect(await remaining([failed])).toEqual([failed]);
    expect(await indexedDocuments([failed])).toEqual([failed]);
    expect(cleanup.execute).not.toHaveBeenCalled();
  });

  it.each([SourceStatus.PROCESSING, SourceStatus.READY])(
    'keeps a failed source that a concurrent transaction turns %s while the removal waits on it',
    async (status) => {
      const knowledgeBaseId = randomUUID();
      const reprocessed = await insertSource(
        knowledgeBaseId,
        SourceStatus.FAILED,
      );
      const failed = await insertSource(knowledgeBaseId, SourceStatus.FAILED);
      const concurrent = db.createQueryRunner();
      await concurrent.connect();
      try {
        await concurrent.startTransaction();
        await concurrent.query(
          `UPDATE "${schema}"."sources" SET status = $1 WHERE id = $2`,
          [status, reprocessed],
        );

        const removal = useCase.execute(command(knowledgeBaseId));
        await waitUntilBlockedOnRowLock();
        await concurrent.commitTransaction();

        await expect(removal).resolves.toEqual([failed]);
        expect(await remaining([reprocessed, failed])).toEqual([reprocessed]);
      } finally {
        if (concurrent.isTransactionActive) {
          await concurrent.rollbackTransaction();
        }
        await concurrent.release();
      }
    },
  );

  async function waitUntilBlockedOnRowLock(): Promise<void> {
    for (let attempt = 0; attempt < 500; attempt++) {
      const [{ waiting }] = await db.query<{ waiting: number }[]>(
        `SELECT count(*)::int AS waiting FROM pg_stat_activity
         WHERE wait_event_type = 'Lock' AND query LIKE 'DELETE FROM "' || $1 || '"%'`,
        [schema],
      );
      if (waiting > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error('Removal never waited on the concurrently updated row');
  }
});
