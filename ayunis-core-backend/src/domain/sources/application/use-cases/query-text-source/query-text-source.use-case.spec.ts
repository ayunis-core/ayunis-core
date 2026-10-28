import type { UUID } from 'crypto';
import type { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import type { SearchContentUseCase } from 'src/domain/rag/indexers/application/use-cases/search-content/search-content.use-case';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { QueryTextSourceCommand } from './query-text-source.command';
import { QueryTextSourceUseCase } from './query-text-source.use-case';

describe('QueryTextSourceUseCase', () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const sourceId = '22222222-2222-2222-2222-222222222222' as UUID;
  const userId = '33333333-3333-3333-3333-333333333333' as UUID;

  function command(): QueryTextSourceCommand {
    return new QueryTextSourceCommand({
      orgId,
      filter: { sourceId, userId },
      query: 'Welche Fristen gelten für den Bauantrag?',
    });
  }

  function setup(searchResult: unknown[] = []) {
    const sourceRepository = {
      findContentChunksByIds: jest.fn(),
    } as unknown as jest.Mocked<SourceRepository>;
    const searchContentUseCase = {
      execute: jest.fn().mockResolvedValue(searchResult),
    } as unknown as jest.Mocked<SearchContentUseCase>;
    const useCase = new QueryTextSourceUseCase(
      sourceRepository,
      searchContentUseCase,
    );
    return { searchContentUseCase, useCase };
  }

  it('limits semantic search to ten matching chunks', async () => {
    const { searchContentUseCase, useCase } = setup();

    await useCase.execute(command());

    expect(searchContentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 }),
    );
  });

  it('wraps unexpected search failures', async () => {
    const { searchContentUseCase, useCase } = setup();
    searchContentUseCase.execute.mockRejectedValue(
      new Error('Vector database unavailable'),
    );

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(
      UnexpectedSourceError,
    );
  });
});
