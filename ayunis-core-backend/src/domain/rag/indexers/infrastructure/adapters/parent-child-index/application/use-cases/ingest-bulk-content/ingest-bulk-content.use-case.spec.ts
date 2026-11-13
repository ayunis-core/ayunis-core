import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IngestBulkContentUseCase } from './ingest-bulk-content.use-case';
import { IngestBulkContentCommand } from './ingest-bulk-content.command';
import { ParentChildIndexerRepositoryPort } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/ports/parent-child-indexer-repository.port';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import {
  SplitResult,
  TextChunk,
} from 'src/domain/rag/splitters/domain/split-result.entity';
import { Embedding } from 'src/domain/rag/embeddings/domain/embedding.entity';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { PermittedEmbeddingModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import type { UUID } from 'crypto';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const DOC_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const CHUNK_ID_1 = '33333333-3333-3333-3333-333333333333' as UUID;
const CHUNK_ID_2 = '44444444-4444-4444-4444-444444444444' as UUID;

const EMBEDDING_MODEL = new EmbeddingModel({
  name: 'mistral-embed',
  provider: ModelProvider.MISTRAL,
  displayName: 'Mistral Embed',
  isArchived: false,
  dimensions: EmbeddingDimensions.DIMENSION_1024,
});

const PERMITTED_MODEL = new PermittedEmbeddingModel({
  model: EMBEDDING_MODEL,
  orgId: ORG_ID,
});

describe('IngestBulkContentUseCase', () => {
  let useCase: IngestBulkContentUseCase;
  let mockRepo: jest.Mocked<ParentChildIndexerRepositoryPort>;
  let mockSplitter: jest.Mocked<SplitTextUseCase>;
  let mockEmbedder: jest.Mocked<EmbedTextUseCase>;
  let mockGetModel: jest.Mocked<GetPermittedEmbeddingModelUseCase>;
  let embeddingsMaxConcurrency: number | undefined;

  beforeEach(async () => {
    embeddingsMaxConcurrency = 16;
    mockRepo = {
      save: jest.fn(),
      saveMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findByDocumentIds: jest.fn(),
    };

    mockSplitter = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<SplitTextUseCase>;

    mockEmbedder = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<EmbedTextUseCase>;

    mockGetModel = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetPermittedEmbeddingModelUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestBulkContentUseCase,
        { provide: ParentChildIndexerRepositoryPort, useValue: mockRepo },
        { provide: SplitTextUseCase, useValue: mockSplitter },
        { provide: EmbedTextUseCase, useValue: mockEmbedder },
        {
          provide: GetPermittedEmbeddingModelUseCase,
          useValue: mockGetModel,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'embeddings.throttle.maxConcurrency'
                ? embeddingsMaxConcurrency
                : undefined,
          },
        },
      ],
    }).compile();

    useCase = module.get(IngestBulkContentUseCase);
  });

  it('should resolve the embedding model exactly once for multiple entries', async () => {
    mockGetModel.execute.mockResolvedValue(PERMITTED_MODEL);
    mockSplitter.execute.mockReturnValue(
      new SplitResult([new TextChunk('child text', { index: 0 })], {}),
    );
    mockEmbedder.execute.mockResolvedValue([
      new Embedding([0.1, 0.2], 'child text', EMBEDDING_MODEL),
      new Embedding([0.3, 0.4], 'child text', EMBEDDING_MODEL),
    ]);

    const command = new IngestBulkContentCommand({
      orgId: ORG_ID,
      entries: [
        {
          indexEntry: new IndexEntry({
            relatedDocumentId: DOC_ID,
            relatedChunkId: CHUNK_ID_1,
          }),
          content: 'Bebauungsplan Gewerbegebiet Abschnitt A',
        },
        {
          indexEntry: new IndexEntry({
            relatedDocumentId: DOC_ID,
            relatedChunkId: CHUNK_ID_2,
          }),
          content: 'Bebauungsplan Gewerbegebiet Abschnitt B',
        },
      ],
    });

    await useCase.execute(command);

    expect(mockGetModel.execute).toHaveBeenCalledTimes(1);
  });

  it('should batch all child texts into a single embedding API call', async () => {
    mockGetModel.execute.mockResolvedValue(PERMITTED_MODEL);

    // Each source chunk splits into 2 child chunks
    mockSplitter.execute
      .mockReturnValueOnce(
        new SplitResult(
          [
            new TextChunk('Kind-Abschnitt 1a', { index: 0 }),
            new TextChunk('Kind-Abschnitt 1b', { index: 1 }),
          ],
          {},
        ),
      )
      .mockReturnValueOnce(
        new SplitResult(
          [
            new TextChunk('Kind-Abschnitt 2a', { index: 0 }),
            new TextChunk('Kind-Abschnitt 2b', { index: 1 }),
          ],
          {},
        ),
      );

    mockEmbedder.execute.mockResolvedValue([
      new Embedding([0.1], 'Kind-Abschnitt 1a', EMBEDDING_MODEL),
      new Embedding([0.2], 'Kind-Abschnitt 1b', EMBEDDING_MODEL),
      new Embedding([0.3], 'Kind-Abschnitt 2a', EMBEDDING_MODEL),
      new Embedding([0.4], 'Kind-Abschnitt 2b', EMBEDDING_MODEL),
    ]);

    const command = new IngestBulkContentCommand({
      orgId: ORG_ID,
      entries: [
        {
          indexEntry: new IndexEntry({
            relatedDocumentId: DOC_ID,
            relatedChunkId: CHUNK_ID_1,
          }),
          content: 'Eltern-Abschnitt 1 mit detaillierten Textinhalten',
        },
        {
          indexEntry: new IndexEntry({
            relatedDocumentId: DOC_ID,
            relatedChunkId: CHUNK_ID_2,
          }),
          content: 'Eltern-Abschnitt 2 mit weiteren Textinhalten',
        },
      ],
    });

    await useCase.execute(command);

    // All 4 child texts should be embedded in a single API call
    expect(mockEmbedder.execute).toHaveBeenCalledTimes(1);
    expect(mockEmbedder.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        texts: [
          'Kind-Abschnitt 1a',
          'Kind-Abschnitt 1b',
          'Kind-Abschnitt 2a',
          'Kind-Abschnitt 2b',
        ],
        model: EMBEDDING_MODEL,
      }),
    );
  });

  it('should save all parent chunks in a single bulk operation', async () => {
    mockGetModel.execute.mockResolvedValue(PERMITTED_MODEL);
    mockSplitter.execute.mockReturnValue(
      new SplitResult([new TextChunk('Kind-Text', { index: 0 })], {}),
    );
    mockEmbedder.execute.mockResolvedValue([
      new Embedding([0.1], 'Kind-Text', EMBEDDING_MODEL),
      new Embedding([0.2], 'Kind-Text', EMBEDDING_MODEL),
    ]);

    const command = new IngestBulkContentCommand({
      orgId: ORG_ID,
      entries: [
        {
          indexEntry: new IndexEntry({
            relatedDocumentId: DOC_ID,
            relatedChunkId: CHUNK_ID_1,
          }),
          content: 'Grundstücksverkehrsgenehmigung Abschnitt A',
        },
        {
          indexEntry: new IndexEntry({
            relatedDocumentId: DOC_ID,
            relatedChunkId: CHUNK_ID_2,
          }),
          content: 'Grundstücksverkehrsgenehmigung Abschnitt B',
        },
      ],
    });

    await useCase.execute(command);

    expect(mockRepo.saveMany).toHaveBeenCalledTimes(1);
    const savedChunks = mockRepo.saveMany.mock.calls[0][0];
    expect(savedChunks).toHaveLength(2);
    expect(savedChunks[0].relatedChunkId).toBe(CHUNK_ID_1);
    expect(savedChunks[1].relatedChunkId).toBe(CHUNK_ID_2);
  });

  it('should correctly map embeddings back to their parent chunks', async () => {
    mockGetModel.execute.mockResolvedValue(PERMITTED_MODEL);

    // Entry 1 → 2 children, Entry 2 → 1 child
    mockSplitter.execute
      .mockReturnValueOnce(
        new SplitResult(
          [
            new TextChunk('A1', { index: 0 }),
            new TextChunk('A2', { index: 1 }),
          ],
          {},
        ),
      )
      .mockReturnValueOnce(
        new SplitResult([new TextChunk('B1', { index: 0 })], {}),
      );

    mockEmbedder.execute.mockResolvedValue([
      new Embedding([1.0], 'A1', EMBEDDING_MODEL),
      new Embedding([2.0], 'A2', EMBEDDING_MODEL),
      new Embedding([3.0], 'B1', EMBEDDING_MODEL),
    ]);

    const command = new IngestBulkContentCommand({
      orgId: ORG_ID,
      entries: [
        {
          indexEntry: new IndexEntry({
            relatedDocumentId: DOC_ID,
            relatedChunkId: CHUNK_ID_1,
          }),
          content: 'Erster Elternblock mit Ratsbeschluss',
        },
        {
          indexEntry: new IndexEntry({
            relatedDocumentId: DOC_ID,
            relatedChunkId: CHUNK_ID_2,
          }),
          content: 'Zweiter Elternblock mit Satzung',
        },
      ],
    });

    await useCase.execute(command);

    const savedChunks = mockRepo.saveMany.mock.calls[0][0];
    expect(savedChunks[0].children).toHaveLength(2);
    expect(savedChunks[0].children[0].embedding).toEqual([1.0]);
    expect(savedChunks[0].children[1].embedding).toEqual([2.0]);
    expect(savedChunks[1].children).toHaveLength(1);
    expect(savedChunks[1].children[0].embedding).toEqual([3.0]);
  });

  describe('a document with many embedding batches', () => {
    const BATCH = 64;

    interface PendingCall {
      texts: string[];
      resolve: () => void;
      reject: (error: Error) => void;
    }

    // One entry whose text splits into `batches` full embedding batches. Each
    // embedder call stays open until the test settles it.
    function longDocument(batches: number): {
      command: IngestBulkContentCommand;
      calls: PendingCall[];
    } {
      const texts = Array.from(
        { length: batches * BATCH },
        (_, index) => `Absatz ${index}`,
      );
      mockGetModel.execute.mockResolvedValue(PERMITTED_MODEL);
      mockSplitter.execute.mockReturnValue(
        new SplitResult(
          texts.map((text, index) => new TextChunk(text, { index })),
          {},
        ),
      );
      const calls: PendingCall[] = [];
      mockEmbedder.execute.mockImplementation(
        (command) =>
          new Promise((resolve, reject) => {
            calls.push({
              texts: command.texts,
              resolve: () =>
                resolve(
                  command.texts.map(
                    (text) =>
                      new Embedding(
                        [Number(text.split(' ')[1])],
                        text,
                        EMBEDDING_MODEL,
                      ),
                  ),
                ),
              reject,
            });
          }),
      );
      const command = new IngestBulkContentCommand({
        orgId: ORG_ID,
        entries: [
          {
            indexEntry: new IndexEntry({
              relatedDocumentId: DOC_ID,
              relatedChunkId: CHUNK_ID_1,
            }),
            content: 'Ein sehr langes Dokument',
          },
        ],
      });
      return { command, calls };
    }

    const settle = () => new Promise((resolve) => setImmediate(resolve));

    it('sends its batches at the same time and keeps the vectors in text order', async () => {
      const { command, calls } = longDocument(5);

      const ingestion = useCase.execute(command);
      await settle();

      expect(calls).toHaveLength(5);
      [...calls].reverse().forEach((call) => call.resolve());
      await ingestion;

      const [saved] = mockRepo.saveMany.mock.calls[0][0];
      expect(saved.children.map((child) => child.embedding[0])).toEqual(
        Array.from({ length: 5 * BATCH }, (_, index) => index),
      );
    });

    it('keeps at most sixteen batches in flight and starts the next one as soon as one returns', async () => {
      const { command, calls } = longDocument(40);

      const ingestion = useCase.execute(command);
      await settle();
      expect(calls).toHaveLength(16);

      calls[3].resolve();
      await settle();
      expect(calls).toHaveLength(17);

      while (mockEmbedder.execute.mock.calls.length < 40 || calls.length > 0) {
        calls.splice(0).forEach((call) => call.resolve());
        await settle();
      }
      await ingestion;
      expect(mockEmbedder.execute).toHaveBeenCalledTimes(40);
    });

    it('follows the configured embeddings limit (EMBEDDINGS_MAX_CONCURRENCY)', async () => {
      embeddingsMaxConcurrency = 4;
      const { command, calls } = longDocument(10);

      const ingestion = useCase.execute(command);
      await settle();
      expect(calls).toHaveLength(4);

      while (mockEmbedder.execute.mock.calls.length < 10 || calls.length > 0) {
        calls.splice(0).forEach((call) => call.resolve());
        await settle();
      }
      await ingestion;
    });

    it('still embeds, sixteen at a time, when the limit is not configured', async () => {
      embeddingsMaxConcurrency = undefined;
      const { command, calls } = longDocument(20);

      const ingestion = useCase.execute(command);
      await settle();
      expect(calls).toHaveLength(16);

      while (mockEmbedder.execute.mock.calls.length < 20 || calls.length > 0) {
        calls.splice(0).forEach((call) => call.resolve());
        await settle();
      }
      await ingestion;
    });

    it('after a failed batch sends no further one and fails only once the started ones have returned', async () => {
      const { command, calls } = longDocument(40);
      let outcome: 'pending' | 'rejected' = 'pending';

      const ingestion = useCase.execute(command).catch((error: Error) => {
        outcome = 'rejected';
        return error;
      });
      await settle();
      calls[0].reject(new Error('embedding failed'));
      await settle();

      expect(outcome).toBe('pending');
      expect(mockEmbedder.execute).toHaveBeenCalledTimes(16);

      calls.slice(1, 15).forEach((call) => call.resolve());
      await settle();
      expect(outcome).toBe('pending');

      calls[15].reject(new Error('second failure'));
      await expect(ingestion).resolves.toMatchObject({
        message: 'embedding failed',
      });
      expect(mockEmbedder.execute).toHaveBeenCalledTimes(16);
      expect(mockRepo.saveMany).not.toHaveBeenCalled();
    });
  });

  it('should do nothing when entries array is empty', async () => {
    const command = new IngestBulkContentCommand({
      orgId: ORG_ID,
      entries: [],
    });

    await useCase.execute(command);

    expect(mockGetModel.execute).not.toHaveBeenCalled();
    expect(mockEmbedder.execute).not.toHaveBeenCalled();
    expect(mockRepo.saveMany).not.toHaveBeenCalled();
  });
});
