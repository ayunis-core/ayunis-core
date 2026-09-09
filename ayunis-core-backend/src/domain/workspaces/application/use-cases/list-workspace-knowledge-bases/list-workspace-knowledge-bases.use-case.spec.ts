import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { FindWorkspaceKnowledgeBasePageUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-workspace-knowledge-base-page/find-workspace-knowledge-base-page.use-case';
import type { CountKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/count-knowledge-base-documents/count-knowledge-base-documents.use-case';
import type { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { ListWorkspaceKnowledgeBasesUseCase } from './list-workspace-knowledge-bases.use-case';
import { ListWorkspaceKnowledgeBasesQuery } from './list-workspace-knowledge-bases.query';

describe('ListWorkspaceKnowledgeBasesUseCase', () => {
  it.each([true, false])(
    'preserves paginated workspace knowledge-base activation: %s',
    async (isActive) => {
      const workspaceId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
      const knowledgeBase = new WorkspaceKnowledgeBase({
        id: '223e4567-e89b-12d3-a456-426614174001',
        name: 'Citizen requests',
        description: 'Citizen request documents',
        orgId: '323e4567-e89b-12d3-a456-426614174002',
        workspaceId,
      });
      const page = new Paginated({
        data: [{ knowledgeBase, isShared: false, isActive }],
        limit: 2,
        offset: 4,
        total: 5,
      });
      const workspacesRepository = {
        findById: jest.fn().mockResolvedValue({}),
      } as unknown as jest.Mocked<WorkspacesRepository>;
      const knowledgeBaseAccessService = {
        execute: jest.fn().mockResolvedValue(page),
      } as unknown as jest.Mocked<FindWorkspaceKnowledgeBasePageUseCase>;
      const workspaceKnowledgeBaseService = {
        execute: jest.fn().mockResolvedValue(new Map([[knowledgeBase.id, 3]])),
      } as unknown as jest.Mocked<CountKnowledgeBaseDocumentsUseCase>;
      const contextService = {
        get: jest.fn().mockReturnValue('523e4567-e89b-12d3-a456-426614174004'),
      } as unknown as jest.Mocked<ContextService>;
      const useCase = new ListWorkspaceKnowledgeBasesUseCase(
        workspacesRepository,
        knowledgeBaseAccessService,
        workspaceKnowledgeBaseService,
        contextService,
      );

      const result = await useCase.execute(
        new ListWorkspaceKnowledgeBasesQuery({
          workspaceId,
          search: 'citizen',
          limit: 2,
          offset: 4,
        }),
      );

      expect(result.data).toEqual([
        {
          id: knowledgeBase.id,
          name: knowledgeBase.name,
          description: knowledgeBase.description,
          documentCount: 3,
          isActive,
        },
      ]);
      expect(result.total).toBe(5);
      expect(knowledgeBaseAccessService.execute).toHaveBeenCalledWith({
        workspaceId,
        search: 'citizen',
        limit: 2,
        offset: 4,
      });
    },
  );
});
