import type { UUID } from 'crypto';
import { SearchContentUseCase } from './search-content.use-case';
import type { ParentChildIndexerRepositoryPort } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/ports/parent-child-indexer-repository.port';
import { ParentChunk } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/parent-chunk.entity';
import type { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import type { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { Embedding } from 'src/domain/rag/embeddings/domain/embedding.entity';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { PermittedEmbeddingModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const CONTRACT_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const STATUTE_ID = '33333333-3333-3333-3333-333333333333' as UUID;
const NOTICE_CHUNK_ID = '44444444-4444-4444-4444-444444444444' as UUID;
const TERM_CHUNK_ID = '55555555-5555-5555-5555-555555555555' as UUID;
const FEE_CHUNK_ID = '66666666-6666-6666-6666-666666666666' as UUID;

const EMBEDDING_MODEL = new EmbeddingModel({
  name: 'mistral-embed',
  provider: ModelProvider.MISTRAL,
  displayName: 'Mistral Embed',
  isArchived: false,
  dimensions: EmbeddingDimensions.DIMENSION_1024,
});

const NOTICE_VECTOR = [0.1];
const TERM_VECTOR = [0.2];

function parentChunk(relatedChunkId: UUID, content: string): ParentChunk {
  return new ParentChunk({
    relatedDocumentId: CONTRACT_ID,
    relatedChunkId,
    content,
    children: [],
  });
}

describe('Parent-child SearchContentUseCase', () => {
  function setup() {
    const repository = {
      findByDocumentIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ParentChildIndexerRepositoryPort>;
    const embedTextUseCase = {
      execute: jest
        .fn()
        .mockImplementation(({ texts }: { texts: string[] }) =>
          Promise.resolve(
            texts.map(
              (text, index) =>
                new Embedding(
                  index === 0 ? NOTICE_VECTOR : TERM_VECTOR,
                  text,
                  EMBEDDING_MODEL,
                ),
            ),
          ),
        ),
    } as unknown as jest.Mocked<EmbedTextUseCase>;
    const getPermittedEmbeddingModelUseCase = {
      execute: jest.fn().mockResolvedValue(
        new PermittedEmbeddingModel({
          model: EMBEDDING_MODEL,
          orgId: ORG_ID,
        }),
      ),
    } as unknown as jest.Mocked<GetPermittedEmbeddingModelUseCase>;
    const useCase = new SearchContentUseCase(
      repository,
      embedTextUseCase,
      getPermittedEmbeddingModelUseCase,
    );
    return { repository, embedTextUseCase, useCase };
  }

  it('embeds every query in a single retrieval embedding call', async () => {
    const { embedTextUseCase, useCase } = setup();

    await useCase.executeMulti({
      orgId: ORG_ID,
      documentIds: [CONTRACT_ID, STATUTE_ID],
      queries: ['Kündigungsfrist', 'Vertragslaufzeit'],
    });

    expect(embedTextUseCase.execute).toHaveBeenCalledTimes(1);
    expect(embedTextUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        texts: ['Kündigungsfrist', 'Vertragslaufzeit'],
        priority: EmbeddingPriority.RETRIEVAL,
      }),
    );
  });

  it('searches all documents once per query vector with the per-query limit', async () => {
    const { repository, useCase } = setup();

    await useCase.executeMulti({
      orgId: ORG_ID,
      documentIds: [CONTRACT_ID, STATUTE_ID],
      queries: ['Kündigungsfrist', 'Vertragslaufzeit'],
      filter: { limit: 10 },
    });

    expect(repository.findByDocumentIds).toHaveBeenCalledTimes(2);
    expect(repository.findByDocumentIds).toHaveBeenCalledWith(
      NOTICE_VECTOR,
      [CONTRACT_ID, STATUTE_ID],
      10,
    );
    expect(repository.findByDocumentIds).toHaveBeenCalledWith(
      TERM_VECTOR,
      [CONTRACT_ID, STATUTE_ID],
      10,
    );
  });

  it('returns a chunk found by several queries once, tagged with every matching query', async () => {
    const { repository, useCase } = setup();
    const notice = parentChunk(NOTICE_CHUNK_ID, 'Kündigung mit drei Monaten');
    repository.findByDocumentIds
      .mockResolvedValueOnce([{ parentChunk: notice, distance: 0.3 }])
      .mockResolvedValueOnce([{ parentChunk: notice, distance: 0.1 }]);

    const matches = await useCase.executeMulti({
      orgId: ORG_ID,
      documentIds: [CONTRACT_ID],
      queries: ['Kündigungsfrist', 'Vertragslaufzeit'],
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].entry.relatedChunkId).toBe(NOTICE_CHUNK_ID);
    expect(matches[0].matchedQueries).toEqual([
      'Kündigungsfrist',
      'Vertragslaufzeit',
    ]);
  });

  it('ranks merged matches by their best distance across queries', async () => {
    const { repository, useCase } = setup();
    const notice = parentChunk(NOTICE_CHUNK_ID, 'Kündigung mit drei Monaten');
    const term = parentChunk(TERM_CHUNK_ID, 'Laufzeit von zwei Jahren');
    const fee = parentChunk(FEE_CHUNK_ID, 'Monatliche Gebühr');
    repository.findByDocumentIds
      .mockResolvedValueOnce([
        { parentChunk: fee, distance: 0.4 },
        { parentChunk: notice, distance: 0.5 },
      ])
      .mockResolvedValueOnce([
        { parentChunk: term, distance: 0.2 },
        { parentChunk: notice, distance: 0.3 },
      ]);

    const matches = await useCase.executeMulti({
      orgId: ORG_ID,
      documentIds: [CONTRACT_ID],
      queries: ['Kündigungsfrist', 'Vertragslaufzeit'],
    });

    expect(matches.map((match) => match.entry.relatedChunkId)).toEqual([
      TERM_CHUNK_ID,
      NOTICE_CHUNK_ID,
      FEE_CHUNK_ID,
    ]);
  });

  it('ignores blank and repeated queries', async () => {
    const { embedTextUseCase, useCase } = setup();

    await useCase.executeMulti({
      orgId: ORG_ID,
      documentIds: [CONTRACT_ID],
      queries: [' Kündigungsfrist ', '   ', 'Kündigungsfrist'],
    });

    expect(embedTextUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ texts: ['Kündigungsfrist'] }),
    );
  });

  it('skips embedding when every query is blank', async () => {
    const { embedTextUseCase, useCase } = setup();

    const matches = await useCase.executeMulti({
      orgId: ORG_ID,
      documentIds: [CONTRACT_ID],
      queries: ['  '],
    });

    expect(matches).toEqual([]);
    expect(embedTextUseCase.execute).not.toHaveBeenCalled();
  });

  it('skips embedding when there are no documents to search', async () => {
    const { embedTextUseCase, useCase } = setup();

    const matches = await useCase.executeMulti({
      orgId: ORG_ID,
      documentIds: [],
      queries: ['Kündigungsfrist'],
    });

    expect(matches).toEqual([]);
    expect(embedTextUseCase.execute).not.toHaveBeenCalled();
  });
});
