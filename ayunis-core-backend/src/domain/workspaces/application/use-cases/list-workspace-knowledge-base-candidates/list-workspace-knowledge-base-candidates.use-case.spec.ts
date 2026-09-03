import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import type { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
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
    const contextService = {
      get: jest.fn().mockReturnValue('523e4567-e89b-12d3-a456-426614174004'),
    } as unknown as jest.Mocked<ContextService>;
    const useCase = new ListWorkspaceKnowledgeBaseCandidatesUseCase(
      workspacesRepository,
      knowledgeBaseAccessService,
      contextService,
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
    expect(
      knowledgeBaseAccessService.findAllAccessiblePaginated,
    ).toHaveBeenCalledWith(undefined, {
      search: 'citizen',
      limit: 2,
      offset: 4,
    });
  });
});
