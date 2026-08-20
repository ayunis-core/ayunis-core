import type { UUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import type { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { ListWorkspaceKnowledgeBaseCandidatesUseCase } from './list-workspace-knowledge-base-candidates.use-case';
import { ListWorkspaceKnowledgeBaseCandidatesQuery } from './list-workspace-knowledge-base-candidates.query';

describe('ListWorkspaceKnowledgeBaseCandidatesUseCase', () => {
  it('returns a paginated candidate page with attachment state', async () => {
    const workspaceId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
    const knowledgeBaseId = '223e4567-e89b-12d3-a456-426614174001' as UUID;
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Citizen requests',
      description: 'Citizen request documents',
      orgId: '323e4567-e89b-12d3-a456-426614174002',
      userId: '423e4567-e89b-12d3-a456-426614174003',
    });
    const page = new Paginated({
      data: [{ knowledgeBase, isShared: false }],
      limit: 2,
      offset: 4,
      total: 5,
    });
    const workspacesRepository = {
      findById: jest.fn().mockResolvedValue({}),
      getContextRefs: jest.fn().mockResolvedValue({
        skillIds: [],
        knowledgeBases: [
          {
            id: knowledgeBaseId,
            name: knowledgeBase.name,
            description: knowledgeBase.description,
            documentCount: 0,
          },
        ],
        sourceIds: [],
      }),
    } as unknown as jest.Mocked<WorkspacesRepository>;
    const knowledgeBaseAccessService = {
      findAllAccessiblePaginated: jest.fn().mockResolvedValue(page),
      countSourcesByKnowledgeBaseIds: jest
        .fn()
        .mockResolvedValue(new Map([[knowledgeBaseId, 0]])),
    } as unknown as jest.Mocked<KnowledgeBaseAccessService>;
    const accessService = {
      requireAccessLevel: jest.fn().mockResolvedValue({}),
    };
    const useCase = new ListWorkspaceKnowledgeBaseCandidatesUseCase(
      createPinoLoggerMock(),
      workspacesRepository,
      knowledgeBaseAccessService,
      accessService as never,
    );

    const result = await useCase.execute(
      new ListWorkspaceKnowledgeBaseCandidatesQuery({
        workspaceId,
        search: 'citizen',
        limit: 2,
        offset: 4,
      }),
    );

    expect(result.data).toEqual([
      { knowledgeBase, documentCount: 0, isAttached: true },
    ]);
    expect(result.total).toBe(5);
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      workspaceId,
      WorkspaceAccessLevel.EDIT,
    );
    expect(
      knowledgeBaseAccessService.findAllAccessiblePaginated,
    ).toHaveBeenCalledWith(undefined, {
      search: 'citizen',
      limit: 2,
      offset: 4,
    });
  });
});
