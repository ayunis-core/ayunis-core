import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, getMetadataArgsStorage } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import {
  SourceRecord,
  TextSourceRecord,
} from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import {
  FileSourceDetailsRecord,
  TextSourceDetailsRecord,
} from 'src/domain/sources/infrastructure/persistence/local/schema/text-source-details.record';
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
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import {
  FileType,
  SourceType,
  TextType,
} from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
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

const ORG_ID = randomUUID();

const EMBEDDING_MODEL = new EmbeddingModel({
  name: 'mistral-embed',
  provider: ModelProvider.MISTRAL,
  displayName: 'Mistral Embed',
  isArchived: false,
  dimensions: EmbeddingDimensions.DIMENSION_1024,
});

const splitTextUseCase = {
  execute: (command: SplitTextCommand) =>
    new SplitResult([new TextChunk(command.text)]),
} as unknown as SplitTextUseCase;

const embedTextUseCase = {
  execute: jest.fn(async (command: EmbedTextCommand) =>
    command.texts.map(
      (text) =>
        new Embedding(new Array<number>(1024).fill(0.5), text, EMBEDDING_MODEL),
    ),
  ),
};

const getPermittedEmbeddingModelUseCase = {
  execute: async () =>
    new PermittedEmbeddingModel({ model: EMBEDDING_MODEL, orgId: ORG_ID }),
} as unknown as GetPermittedEmbeddingModelUseCase;

function chunksFor(...contents: string[]): TextSourceContentChunk[] {
  return contents.map(
    (content) =>
      new TextSourceContentChunk({ content, meta: { fileName: 'plan.pdf' } }),
  );
}

describe('Source content replacement (Postgres)', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let txHost: TransactionHost<TransactionalAdapterTypeOrm>;
  let sourceRepository: LocalSourceRepository;
  let indexRepository: ParentChildIndexerRepository;
  let service: SourceContentReplacementService;

  beforeAll(async () => {
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
    schemaName = `ayc_1126_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
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

    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    txHost = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(dataSource),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });

    const chunkMapper = new SourceContentChunkMapper();
    sourceRepository = new LocalSourceRepository(
      dataSource.getRepository(SourceRecord),
      new SourceMapper(chunkMapper),
      chunkMapper,
      txHost,
    );
    indexRepository = new ParentChildIndexerRepository(
      dataSource.getRepository(ParentChunkRecord),
      new ParentChildIndexerMapper(),
      txHost,
    );
    const indexer = new ParentChildIndexerAdapter(
      new ParentChildPrepareBulkContentUseCase(
        splitTextUseCase,
        embedTextUseCase as unknown as EmbedTextUseCase,
        getPermittedEmbeddingModelUseCase,
      ),
      new ParentChildReplaceContentUseCase(indexRepository),
      {} as SearchContentUseCase,
      new ParentChildDeleteContentUseCase(indexRepository),
      {} as DeleteContentsUseCase,
    );
    const registry = new IndexRegistry();
    registry.register(IndexType.PARENT_CHILD, indexer);
    service = new SourceContentReplacementService(
      sourceRepository,
      new PrepareBulkContentUseCase(registry),
      new ReplaceBulkContentUseCase(registry),
    );
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function processingSource(): FileSource {
    return new FileSource({
      name: 'Bebauungsplan.pdf',
      type: TextType.FILE,
      fileType: FileType.PDF,
      status: SourceStatus.PROCESSING,
    });
  }

  // Processing pipelines always commit onto a row created beforehand.
  async function newSource(): Promise<FileSource> {
    const source = processingSource();
    await sourceRepository.save(source);
    return source;
  }

  async function writeContent(
    source: FileSource,
    text: string,
    chunks: TextSourceContentChunk[],
  ): Promise<void> {
    const prepared = await service.prepare({
      sourceId: source.id,
      orgId: ORG_ID,
      text,
      chunks,
    });
    await service.commit(source, prepared);
  }

  async function storedContent(sourceId: UUID) {
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

  it('writes text, chunks and index entries on initial ingestion', async () => {
    const source = await newSource();

    await writeContent(
      source,
      'Fassung 2024',
      chunksFor('Abschnitt A 2024', 'Abschnitt B 2024'),
    );

    const stored = await storedContent(source.id);
    expect(stored.texts).toEqual(['Fassung 2024']);
    expect(stored.chunkContents).toEqual([
      'Abschnitt A 2024',
      'Abschnitt B 2024',
    ]);
    expect(stored.indexedChunkIds).toEqual(
      [...stored.chunkIds].sort((a, b) => a.localeCompare(b)),
    );
    expect(stored.childCount).toBe(2);
  });

  it('leaves exactly one set of chunks and index entries after a second write', async () => {
    const source = await newSource();
    await writeContent(
      source,
      'Fassung 2024',
      chunksFor('Abschnitt A 2024', 'Abschnitt B 2024'),
    );

    await writeContent(
      source,
      'Fassung 2025',
      chunksFor('Abschnitt A 2025', 'Abschnitt B 2025', 'Abschnitt C 2025'),
    );

    const stored = await storedContent(source.id);
    expect(stored.texts).toEqual(['Fassung 2025']);
    expect(stored.chunkContents).toEqual([
      'Abschnitt A 2025',
      'Abschnitt B 2025',
      'Abschnitt C 2025',
    ]);
    expect(stored.indexedContents).toEqual(stored.chunkContents);
    expect(stored.indexedChunkIds).toEqual(
      [...stored.chunkIds].sort((a, b) => a.localeCompare(b)),
    );
    expect(stored.childCount).toBe(3);
  });

  it('keeps the previous text, chunks and index when the index insert fails after the delete', async () => {
    const source = await newSource();
    await writeContent(source, 'Fassung 2024', chunksFor('Abschnitt A 2024'));
    const before = await storedContent(source.id);
    const deleteSpy = jest.spyOn(indexRepository, 'delete');
    jest
      .spyOn(indexRepository, 'saveMany')
      .mockRejectedValueOnce(new Error('connection reset while inserting'));

    await expect(
      writeContent(source, 'Fassung 2025', chunksFor('Abschnitt A 2025')),
    ).rejects.toThrow();

    expect(deleteSpy).toHaveBeenCalledWith(source.id);
    await expect(storedContent(source.id)).resolves.toEqual(before);
  });

  it('embeds with no transaction open and keeps the previous content when embedding fails', async () => {
    const source = await newSource();
    await writeContent(source, 'Fassung 2024', chunksFor('Abschnitt A 2024'));
    const before = await storedContent(source.id);
    let transactionOpenDuringEmbedding: boolean | undefined;
    embedTextUseCase.execute.mockImplementationOnce(async () => {
      transactionOpenDuringEmbedding = txHost.isTransactionActive();
      throw new Error('embedding provider unavailable');
    });

    await expect(
      writeContent(source, 'Fassung 2025', chunksFor('Abschnitt A 2025')),
    ).rejects.toThrow('embedding provider unavailable');

    expect(transactionOpenDuringEmbedding).toBe(false);
    await expect(storedContent(source.id)).resolves.toEqual(before);
  });

  it('removes all previous chunks and index entries when the new content is empty', async () => {
    const source = await newSource();
    await writeContent(source, 'Fassung 2024', chunksFor('Abschnitt A 2024'));

    await writeContent(source, '', []);

    await expect(storedContent(source.id)).resolves.toEqual({
      texts: [''],
      chunkContents: [],
      chunkIds: [],
      indexedChunkIds: [],
      indexedContents: [],
      childCount: 0,
    });
  });

  it('replaces content whose details row predates the source-id keyed details', async () => {
    const source = processingSource();
    const sourceRecord = new TextSourceRecord();
    Object.assign(sourceRecord, {
      id: source.id,
      name: source.name,
      type: SourceType.TEXT,
      textType: TextType.FILE,
      fileType: FileType.PDF,
      status: SourceStatus.PROCESSING,
    });
    await dataSource.getRepository(SourceRecord).save(sourceRecord);
    const legacyDetails = new FileSourceDetailsRecord();
    Object.assign(legacyDetails, {
      id: randomUUID(),
      source: sourceRecord,
      text: 'Fassung 2019',
      fileType: FileType.PDF,
    });
    await dataSource.getRepository(TextSourceDetailsRecord).save(legacyDetails);
    const legacyChunk = new SourceContentChunkRecord();
    Object.assign(legacyChunk, {
      id: randomUUID(),
      source: legacyDetails,
      content: 'Abschnitt A 2019',
      meta: {},
    });
    await dataSource.getRepository(SourceContentChunkRecord).save(legacyChunk);

    await writeContent(source, 'Fassung 2025', chunksFor('Abschnitt A 2025'));

    const stored = await storedContent(source.id);
    expect(stored.texts).toEqual(['Fassung 2025']);
    expect(stored.chunkContents).toEqual(['Abschnitt A 2025']);
    expect(stored.indexedChunkIds).toEqual(stored.chunkIds);
  });

  it('writes nothing when the source was deleted before the commit', async () => {
    const source = await newSource();
    await writeContent(source, 'Fassung 2024', chunksFor('Abschnitt A 2024'));
    const prepared = await service.prepare({
      sourceId: source.id,
      orgId: ORG_ID,
      text: 'Fassung 2025',
      chunks: chunksFor('Abschnitt A 2025'),
    });
    await dataSource.getRepository(SourceRecord).delete({ id: source.id });

    await expect(service.commit(source, prepared)).resolves.toBeNull();

    await expect(
      dataSource.getRepository(SourceRecord).existsBy({ id: source.id }),
    ).resolves.toBe(false);
    await expect(storedContent(source.id)).resolves.toEqual({
      texts: [],
      chunkContents: [],
      chunkIds: [],
      indexedChunkIds: [],
      indexedContents: [],
      childCount: 0,
    });
  });

  it('leaves exactly one set of content when two commits for a source overlap', async () => {
    const source = await newSource();
    await writeContent(source, 'Fassung 2024', chunksFor('Abschnitt A 2024'));
    const first = await service.prepare({
      sourceId: source.id,
      orgId: ORG_ID,
      text: 'Fassung 2025 (Lauf 1)',
      chunks: chunksFor('Lauf 1 Abschnitt A', 'Lauf 1 Abschnitt B'),
    });
    const second = await service.prepare({
      sourceId: source.id,
      orgId: ORG_ID,
      text: 'Fassung 2025 (Lauf 2)',
      chunks: chunksFor('Lauf 2 Abschnitt A'),
    });

    const results = await Promise.allSettled([
      service.commit(source, first),
      service.commit(source, second),
    ]);

    expect(results.some((result) => result.status === 'fulfilled')).toBe(true);
    const stored = await storedContent(source.id);
    expect(stored.texts).toHaveLength(1);
    const winner = stored.texts[0].includes('Lauf 1') ? 'Lauf 1' : 'Lauf 2';
    expect(
      stored.chunkContents.every((content) => content.startsWith(winner)),
    ).toBe(true);
    expect(stored.indexedChunkIds).toEqual(
      [...stored.chunkIds].sort((a, b) => a.localeCompare(b)),
    );
  });
});
