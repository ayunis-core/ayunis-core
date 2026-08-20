import type { UUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { ListSourcesByWorkspaceUseCase } from 'src/domain/sources/application/use-cases/list-sources-by-workspace/list-sources-by-workspace.use-case';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
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
    const accessService = {
      requireAccessLevel: jest.fn().mockResolvedValue({}),
    };
    const listSourcesByWorkspaceUseCase = {
      execute: jest.fn().mockResolvedValue(page),
    } as unknown as jest.Mocked<ListSourcesByWorkspaceUseCase>;
    const useCase = new ListWorkspaceDocumentsUseCase(
      createPinoLoggerMock(),
      listSourcesByWorkspaceUseCase,
      accessService as never,
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
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      workspaceId,
      WorkspaceAccessLevel.USE,
    );
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
