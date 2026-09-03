import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { ListSourcesByWorkspaceUseCase } from 'src/domain/sources/application/use-cases/list-sources-by-workspace/list-sources-by-workspace.use-case';
import type { Source } from 'src/domain/sources/domain/source.entity';
import type { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { ListWorkspaceDocumentsUseCase } from './list-workspace-documents.use-case';
import { ListWorkspaceDocumentsQuery } from './list-workspace-documents.query';

describe('ListWorkspaceDocumentsUseCase', () => {
  it('returns the paginated documents attached to a workspace', async () => {
    const workspaceId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
    const page = new Paginated<Source>({
      data: [],
      limit: 2,
      offset: 4,
      total: 5,
    });
    const workspacesRepository = {
      findById: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<WorkspacesRepository>;
    const listSourcesByWorkspaceUseCase = {
      execute: jest.fn().mockResolvedValue(page),
    } as unknown as jest.Mocked<ListSourcesByWorkspaceUseCase>;
    const contextService = {
      get: jest.fn().mockReturnValue('223e4567-e89b-12d3-a456-426614174001'),
    } as unknown as jest.Mocked<ContextService>;
    const useCase = new ListWorkspaceDocumentsUseCase(
      workspacesRepository,
      listSourcesByWorkspaceUseCase,
      contextService,
    );

    const result = await useCase.execute(
      new ListWorkspaceDocumentsQuery({
        workspaceId,
        search: 'budget',
        limit: 2,
        offset: 4,
      }),
    );

    expect(result).toBe(page);
    expect(listSourcesByWorkspaceUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        search: 'budget',
        limit: 2,
        offset: 4,
      }),
    );
  });
});
