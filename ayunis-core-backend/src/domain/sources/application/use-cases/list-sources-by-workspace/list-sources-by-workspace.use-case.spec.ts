import type { UUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';
import type { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { ListSourcesByWorkspaceUseCase } from './list-sources-by-workspace.use-case';
import { ListSourcesByWorkspaceQuery } from './list-sources-by-workspace.query';

describe('ListSourcesByWorkspaceUseCase', () => {
  it('returns the requested workspace source page', async () => {
    const workspaceId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
    const page = new Paginated<Source>({
      data: [],
      limit: 2,
      offset: 4,
      total: 7,
    });
    const repository = {
      findPaginatedByWorkspaceId: jest.fn().mockResolvedValue(page),
    } as unknown as jest.Mocked<SourceRepository>;
    const useCase = new ListSourcesByWorkspaceUseCase(repository);

    const result = await useCase.execute(
      new ListSourcesByWorkspaceQuery({
        workspaceId,
        search: 'budget',
        limit: 2,
        offset: 4,
      }),
    );

    expect(result).toBe(page);
    expect(repository.findPaginatedByWorkspaceId).toHaveBeenCalledWith({
      workspaceId,
      search: 'budget',
      limit: 2,
      offset: 4,
    });
  });
});
