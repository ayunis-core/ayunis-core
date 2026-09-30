import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, getMetadataArgsStorage } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { TextSourceDetailsRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/text-source-details.record';
import { SourceContentChunkRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source-content-chunk.record';
import { ParentChunkRecord } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/infrastructure/persistence/schema/parent-chunk.record';
import { ChildChunkRecord } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/infrastructure/persistence/schema/child-chunk.record';
import { LocalSourceRepository } from 'src/domain/sources/infrastructure/persistence/local/local-source.repository';
import { SourceMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source.mapper';
import { SourceContentChunkMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source-content-chunk.mapper';
import { ParentChildIndexerRepository } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/parent-child-index.repository';
import { ParentChildIndexerMapper } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/infrastructure/persistence/mappers/parent-child-indexer.mapper';
import { PrepareBulkContentUseCase as ParentChildPrepareBulkContentUseCase } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/use-cases/prepare-bulk-content/prepare-bulk-content.use-case';
import { ReplaceContentUseCase as ParentChildReplaceContentUseCase } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/use-cases/replace-content/replace-content.use-case';
import { DeleteContentUseCase as ParentChildDeleteContentUseCase } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/use-cases/delete-content/delete-content.use-case';
import { ParentChildIndexerAdapter } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/parent-child-indexer.adapter';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { PrepareBulkContentUseCase } from 'src/domain/rag/indexers/application/use-cases/prepare-bulk-content/prepare-bulk-content.use-case';
import { ReplaceBulkContentUseCase } from 'src/domain/rag/indexers/application/use-cases/replace-bulk-content/replace-bulk-content.use-case';
import { SourceContentReplacementService } from 'src/domain/sources/application/services/source-content-replacement.service';
import {
  SplitResult,
  TextChunk,
} from 'src/domain/rag/splitters/domain/split-result.entity';
import { Embedding } from 'src/domain/rag/embeddings/domain/embedding.entity';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { PermittedEmbeddingModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import type { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import type { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import type { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import type { EmbedTextCommand } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.command';
import type { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import type { SearchContentUseCase } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/use-cases/search-content/search-content.use-case';
import type { DeleteContentsUseCase } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/use-cases/delete-contents/delete-contents.use-case';

const EMBEDDING_MODEL = new EmbeddingModel({
  name: 'mistral-embed',
  provider: ModelProvider.MISTRAL,
  displayName: 'Mistral Embed',
  isArchived: false,
  dimensions: EmbeddingDimensions.DIMENSION_1024,
});

export interface StoredSourceContent {
  texts: string[];
  chunkContents: string[];
  chunkIds: UUID[];
  indexedChunkIds: UUID[];
  indexedContents: string[];
  childCount: number;
}

/**
 * Real source and parent-child index persistence in a throwaway Postgres
 * schema, with deterministic in-process splitting and embedding.
 */
export interface SourcePostgresHarness {
  dataSource: DataSource;
  txHost: TransactionHost<TransactionalAdapterTypeOrm>;
  sourceRepository: LocalSourceRepository;
  indexRepository: ParentChildIndexerRepository;
  contentReplacement: SourceContentReplacementService;
  embedText: jest.Mock<Promise<Embedding[]>, [EmbedTextCommand]>;
  storedContent(sourceId: UUID): Promise<StoredSourceContent>;
  destroy(): Promise<void>;
}

export async function createSourcePostgresHarness(
  orgId: UUID,
): Promise<SourcePostgresHarness> {
  const schemaName = `sources_it_${randomUUID().replaceAll('-', '')}`;
  const dataSource = await createSchemaDataSource(schemaName);
  const txHost = createTxHost(dataSource);

  const chunkMapper = new SourceContentChunkMapper();
  const sourceRepository = new LocalSourceRepository(
    dataSource.getRepository(SourceRecord),
    new SourceMapper(chunkMapper),
    chunkMapper,
    txHost,
  );
  const indexRepository = new ParentChildIndexerRepository(
    dataSource.getRepository(ParentChunkRecord),
    new ParentChildIndexerMapper(),
    txHost,
  );
  const embedText = createEmbedText();
  const registry = new IndexRegistry();
  registry.register(
    IndexType.PARENT_CHILD,
    createIndexer(indexRepository, embedText, orgId),
  );
  const contentReplacement = new SourceContentReplacementService(
    sourceRepository,
    new PrepareBulkContentUseCase(registry),
    new ReplaceBulkContentUseCase(registry),
  );

  return {
    dataSource,
    txHost,
    sourceRepository,
    indexRepository,
    contentReplacement,
    embedText,
    storedContent: (sourceId) => readStoredContent(dataSource, sourceId),
    destroy: () => dropSchema(dataSource, schemaName),
  };
}

async function createSchemaDataSource(schemaName: string): Promise<DataSource> {
  // Importing the records above registers them and every record they relate
  // to; synchronising that closure gives the real tables, FKs and cascades.
  const metadata = getMetadataArgsStorage();
  const entities = metadata.tables.map((table) => table.target);
  // ts-jest's isolatedModules cannot resolve the `UUID` type alias, so it
  // reflects those columns as Object; the compiled app sees String.
  for (const column of metadata.columns) {
    if ((column.options.type as unknown) === Object) {
      column.options.type = String;
    }
  }
  const dataSource = new DataSource({
    ...(typeormConfigRaw as PostgresConnectionOptions),
    schema: schemaName,
    // Raw-SQL repository methods name tables unqualified; resolve them in the
    // throwaway schema, and pgvector's type in public.
    extra: {
      ...((typeormConfigRaw as PostgresConnectionOptions).extra as object),
      options: `-c search_path=${schemaName},public`,
    },
    entities,
    migrations: [],
    migrationsRun: false,
    logging: false,
  });
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.createSchema(schemaName, true);
  await queryRunner.release();
  await dataSource.synchronize();
  return dataSource;
}

function createTxHost(
  dataSource: DataSource,
): TransactionHost<TransactionalAdapterTypeOrm> {
  const adapter = new TransactionalAdapterTypeOrm({
    dataSourceToken: DataSource,
  });
  return new TransactionHost<TransactionalAdapterTypeOrm>({
    ...adapter.optionsFactory(dataSource),
    connectionName: undefined,
    enableTransactionProxy: false,
    defaultTxOptions: {},
    extraProviderTokens: [],
  });
}

function createEmbedText(): SourcePostgresHarness['embedText'] {
  return jest.fn((command: EmbedTextCommand) =>
    Promise.resolve(
      command.texts.map(
        (text) =>
          new Embedding(
            new Array<number>(1024).fill(0.5),
            text,
            EMBEDDING_MODEL,
          ),
      ),
    ),
  );
}

function createIndexer(
  indexRepository: ParentChildIndexerRepository,
  embedText: SourcePostgresHarness['embedText'],
  orgId: UUID,
): ParentChildIndexerAdapter {
  const splitTextUseCase = {
    execute: (command: SplitTextCommand) =>
      new SplitResult([new TextChunk(command.text)]),
  } as unknown as SplitTextUseCase;
  const getPermittedEmbeddingModelUseCase = {
    execute: () =>
      Promise.resolve(
        new PermittedEmbeddingModel({ model: EMBEDDING_MODEL, orgId }),
      ),
  } as unknown as GetPermittedEmbeddingModelUseCase;
  return new ParentChildIndexerAdapter(
    new ParentChildPrepareBulkContentUseCase(
      splitTextUseCase,
      { execute: embedText } as unknown as EmbedTextUseCase,
      getPermittedEmbeddingModelUseCase,
    ),
    new ParentChildReplaceContentUseCase(indexRepository),
    {} as SearchContentUseCase,
    new ParentChildDeleteContentUseCase(indexRepository),
    {} as DeleteContentsUseCase,
  );
}

async function readStoredContent(
  dataSource: DataSource,
  sourceId: UUID,
): Promise<StoredSourceContent> {
  const details = await dataSource
    .getRepository(TextSourceDetailsRecord)
    .find({ where: { source: { id: sourceId } } });
  const chunks = await dataSource
    .getRepository(SourceContentChunkRecord)
    .createQueryBuilder('chunk')
    .innerJoin('chunk.source', 'details')
    .where('details."sourceId" = :sourceId', { sourceId })
    .orderBy('chunk.content')
    .getMany();
  const parents = await dataSource.getRepository(ParentChunkRecord).find({
    where: { relatedDocumentId: sourceId },
    order: { content: 'ASC' },
  });
  const children = await dataSource
    .getRepository(ChildChunkRecord)
    .createQueryBuilder('child')
    .innerJoin('child.parent', 'parent')
    .where('parent."relatedDocumentId" = :sourceId', { sourceId })
    .getCount();
  return {
    texts: details.map((row) => row.text),
    chunkContents: chunks.map((chunk) => chunk.content),
    chunkIds: chunks.map((chunk) => chunk.id),
    indexedChunkIds: parents
      .map((parent) => parent.relatedChunkId)
      .sort((a, b) => a.localeCompare(b)),
    indexedContents: parents.map((parent) => parent.content),
    childCount: children,
  };
}

async function dropSchema(
  dataSource: DataSource,
  schemaName: string,
): Promise<void> {
  if (!dataSource.isInitialized) return;
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.dropSchema(schemaName, true, true);
  await queryRunner.release();
  await dataSource.destroy();
}
