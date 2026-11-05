import type { UUID } from 'crypto';
import type { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import type { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import {
  SourceNotFoundError,
  UnexpectedSourceError,
} from 'src/domain/sources/application/sources.errors';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { IndexMatch } from 'src/domain/rag/indexers/domain/index-match.entity';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { QueryTextSourceCommand } from './query-text-source.command';
import { QueryTextSourceUseCase } from './query-text-source.use-case';

describe('QueryTextSourceUseCase', () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const permitId = '22222222-2222-2222-2222-222222222222' as UUID;
  const feesId = '33333333-3333-3333-3333-333333333333' as UUID;
  const queries = ['Fristen Bauantrag', 'Gebühren Baugenehmigung'];

  function fileSource(id: UUID, name: string): FileSource {
    return new FileSource({
      id,
      name,
      fileType: FileType.PDF,
      type: TextType.FILE,
    });
  }

  function chunkResult(chunkId: UUID, sourceId: UUID, sourceName: string) {
    return {
      chunk: new TextSourceContentChunk({
        id: chunkId,
        content: `Auszug aus ${sourceName}`,
        meta: {},
      }),
      sourceId,
      sourceName,
      sourceCreatedBy: SourceCreator.USER,
    };
  }

  function match(
    chunkId: UUID,
    sourceId: UUID,
    matchedQueries: string[],
  ): IndexMatch {
    return new IndexMatch({
      entry: new IndexEntry({
        relatedDocumentId: sourceId,
        relatedChunkId: chunkId,
      }),
      matchedQueries,
    });
  }

  function command(sourceIds: UUID[] = [permitId, feesId]) {
    return new QueryTextSourceCommand({ orgId, sourceIds, queries });
  }

  function setup() {
    const sources = new Map<UUID, FileSource>([
      [permitId, fileSource(permitId, 'Bauordnung.pdf')],
      [feesId, fileSource(feesId, 'Gebührensatzung.pdf')],
    ]);
    const sourceRepository = {
      findById: jest
        .fn()
        .mockImplementation((id: UUID) =>
          Promise.resolve(sources.get(id) ?? null),
        ),
      findContentChunksByIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SourceRepository>;
    const searchContentUseCase = {
      executeMulti: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SearchContentUseCase>;
    const useCase = new QueryTextSourceUseCase(
      sourceRepository,
      searchContentUseCase,
    );
    return { sourceRepository, searchContentUseCase, useCase };
  }

  it('searches every requested source with every query in one search', async () => {
    const { searchContentUseCase, useCase } = setup();

    await useCase.execute(command());

    expect(searchContentUseCase.executeMulti).toHaveBeenCalledTimes(1);
    expect(searchContentUseCase.executeMulti).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId,
        documentIds: [permitId, feesId],
        queries,
        limit: 10,
      }),
    );
  });

  it('rejects the whole query when any requested source does not exist', async () => {
    const { searchContentUseCase, useCase } = setup();
    const deletedId = '44444444-4444-4444-4444-444444444444' as UUID;

    await expect(
      useCase.execute(command([permitId, deletedId])),
    ).rejects.toThrow(new SourceNotFoundError(deletedId));
    expect(searchContentUseCase.executeMulti).not.toHaveBeenCalled();
  });

  it('returns chunks in ranked order with their source and matching queries', async () => {
    const { sourceRepository, searchContentUseCase, useCase } = setup();
    const feeChunkId = '55555555-5555-5555-5555-555555555555' as UUID;
    const deadlineChunkId = '66666666-6666-6666-6666-666666666666' as UUID;
    searchContentUseCase.executeMulti.mockResolvedValue([
      match(feeChunkId, feesId, ['Gebühren Baugenehmigung']),
      match(deadlineChunkId, permitId, queries),
    ]);
    sourceRepository.findContentChunksByIds.mockResolvedValue([
      chunkResult(deadlineChunkId, permitId, 'Bauordnung.pdf'),
      chunkResult(feeChunkId, feesId, 'Gebührensatzung.pdf'),
    ]);

    const results = await useCase.execute(command());

    expect(
      results.map((result) => ({
        chunkId: result.chunk.id,
        sourceName: result.sourceName,
        matchedQueries: result.matchedQueries,
      })),
    ).toEqual([
      {
        chunkId: feeChunkId,
        sourceName: 'Gebührensatzung.pdf',
        matchedQueries: ['Gebühren Baugenehmigung'],
      },
      {
        chunkId: deadlineChunkId,
        sourceName: 'Bauordnung.pdf',
        matchedQueries: queries,
      },
    ]);
  });

  it('returns at most twenty chunks across all queries', async () => {
    const { sourceRepository, searchContentUseCase, useCase } = setup();
    const chunkIds = Array.from(
      { length: 25 },
      (_, index) =>
        `77777777-7777-7777-7777-${String(index).padStart(12, '0')}` as UUID,
    );
    searchContentUseCase.executeMulti.mockResolvedValue(
      chunkIds.map((chunkId) => match(chunkId, permitId, [queries[0]])),
    );
    sourceRepository.findContentChunksByIds.mockImplementation((ids) =>
      Promise.resolve(
        ids.map((id) => chunkResult(id, permitId, 'Bauordnung.pdf')),
      ),
    );

    const results = await useCase.execute(command());

    expect(results).toHaveLength(20);
    expect(sourceRepository.findContentChunksByIds).toHaveBeenCalledWith(
      chunkIds.slice(0, 20),
    );
  });

  it('skips matches whose chunk no longer exists', async () => {
    const { searchContentUseCase, useCase } = setup();
    searchContentUseCase.executeMulti.mockResolvedValue([
      match('88888888-8888-8888-8888-888888888888', permitId, queries),
    ]);

    const results = await useCase.execute(command());

    expect(results).toEqual([]);
  });

  it('wraps unexpected search failures', async () => {
    const { searchContentUseCase, useCase } = setup();
    searchContentUseCase.executeMulti.mockRejectedValue(
      new Error('Vector database unavailable'),
    );

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(
      UnexpectedSourceError,
    );
  });
});
