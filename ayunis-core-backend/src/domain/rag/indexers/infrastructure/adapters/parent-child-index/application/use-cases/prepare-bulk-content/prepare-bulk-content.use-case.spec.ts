import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PrepareBulkContentUseCase } from './prepare-bulk-content.use-case';
import { PrepareBulkContentCommand } from './prepare-bulk-content.command';
import { PreparedParentChildContent } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/prepared-parent-child-content.entity';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
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

describe('PrepareBulkContentUseCase', () => {
  let useCase: PrepareBulkContentUseCase;
  let mockSplitter: jest.Mocked<SplitTextUseCase>;
  let mockEmbedder: jest.Mocked<EmbedTextUseCase>;
  let mockGetModel: jest.Mocked<GetPermittedEmbeddingModelUseCase>;

  beforeEach(async () => {
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
        PrepareBulkContentUseCase,
        { provide: SplitTextUseCase, useValue: mockSplitter },
        { provide: EmbedTextUseCase, useValue: mockEmbedder },
        {
          provide: GetPermittedEmbeddingModelUseCase,
          useValue: mockGetModel,
        },
      ],
    }).compile();

    useCase = module.get(PrepareBulkContentUseCase);
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

    const command = new PrepareBulkContentCommand({
      orgId: ORG_ID,
      documentId: DOC_ID,
      entries: [
        {
          chunkId: CHUNK_ID_1,
          content: 'Bebauungsplan Gewerbegebiet Abschnitt A',
        },
        {
          chunkId: CHUNK_ID_2,
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

    const command = new PrepareBulkContentCommand({
      orgId: ORG_ID,
      documentId: DOC_ID,
      entries: [
        {
          chunkId: CHUNK_ID_1,
          content: 'Eltern-Abschnitt 1 mit detaillierten Textinhalten',
        },
        {
          chunkId: CHUNK_ID_2,
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

  it('should prepare one parent chunk per entry for the document, in entry order', async () => {
    mockGetModel.execute.mockResolvedValue(PERMITTED_MODEL);
    mockSplitter.execute.mockReturnValue(
      new SplitResult([new TextChunk('Kind-Text', { index: 0 })], {}),
    );
    mockEmbedder.execute.mockResolvedValue([
      new Embedding([0.1], 'Kind-Text', EMBEDDING_MODEL),
      new Embedding([0.2], 'Kind-Text', EMBEDDING_MODEL),
    ]);

    const command = new PrepareBulkContentCommand({
      orgId: ORG_ID,
      documentId: DOC_ID,
      entries: [
        {
          chunkId: CHUNK_ID_1,
          content: 'Grundstücksverkehrsgenehmigung Abschnitt A',
        },
        {
          chunkId: CHUNK_ID_2,
          content: 'Grundstücksverkehrsgenehmigung Abschnitt B',
        },
      ],
    });

    const prepared = await useCase.execute(command);

    expect(prepared).toBeInstanceOf(PreparedParentChildContent);
    expect(prepared.type).toBe(IndexType.PARENT_CHILD);
    expect(prepared.documentId).toBe(DOC_ID);
    expect(
      prepared.parentChunks.map((chunk) => [
        chunk.relatedDocumentId,
        chunk.relatedChunkId,
      ]),
    ).toEqual([
      [DOC_ID, CHUNK_ID_1],
      [DOC_ID, CHUNK_ID_2],
    ]);
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

    const command = new PrepareBulkContentCommand({
      orgId: ORG_ID,
      documentId: DOC_ID,
      entries: [
        {
          chunkId: CHUNK_ID_1,
          content: 'Erster Elternblock mit Ratsbeschluss',
        },
        {
          chunkId: CHUNK_ID_2,
          content: 'Zweiter Elternblock mit Satzung',
        },
      ],
    });

    const { parentChunks: savedChunks } = await useCase.execute(command);

    expect(savedChunks[0].children).toHaveLength(2);
    expect(savedChunks[0].children[0].embedding).toEqual([1.0]);
    expect(savedChunks[0].children[1].embedding).toEqual([2.0]);
    expect(savedChunks[1].children).toHaveLength(1);
    expect(savedChunks[1].children[0].embedding).toEqual([3.0]);
  });

  it('should prepare an empty replacement without provider calls when entries array is empty', async () => {
    const command = new PrepareBulkContentCommand({
      orgId: ORG_ID,
      documentId: DOC_ID,
      entries: [],
    });

    const prepared = await useCase.execute(command);

    expect(prepared.documentId).toBe(DOC_ID);
    expect(prepared.parentChunks).toEqual([]);
    expect(mockGetModel.execute).not.toHaveBeenCalled();
    expect(mockEmbedder.execute).not.toHaveBeenCalled();
  });
});
