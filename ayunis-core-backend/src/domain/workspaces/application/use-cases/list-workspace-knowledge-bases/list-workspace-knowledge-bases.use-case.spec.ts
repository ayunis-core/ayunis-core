import type { UUID } from 'crypto';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { ListWorkspaceKnowledgeBasesUseCase } from './list-workspace-knowledge-bases.use-case';
import { ListWorkspaceKnowledgeBasesQuery } from './list-workspace-knowledge-bases.query';

describe('ListWorkspaceKnowledgeBasesUseCase', () => {
  it('returns the paginated knowledge bases attached to a workspace', async () => {
    const workspaceId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
    const knowledgeBase = new KnowledgeBase({
      id: '223e4567-e89b-12d3-a456-426614174001',
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
    const accessService = {
      requireAccessLevel: jest.fn().mockResolvedValue({}),
    };
    const knowledgeBaseAccessService = {
      findAllAccessiblePaginated: jest.fn().mockResolvedValue(page),
      countSourcesByKnowledgeBaseIds: jest
        .fn()
        .mockResolvedValue(new Map([[knowledgeBase.id, 3]])),
    } as unknown as jest.Mocked<KnowledgeBaseAccessService>;
    const useCase = new ListWorkspaceKnowledgeBasesUseCase(
      createPinoLoggerMock(),
      knowledgeBaseAccessService,
      accessService as never,
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
      },
    ]);
    expect(result.total).toBe(5);
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      workspaceId,
      WorkspaceAccessLevel.USE,
    );
    expect(
      knowledgeBaseAccessService.findAllAccessiblePaginated,
    ).toHaveBeenCalledWith(workspaceId, {
      search: 'citizen',
      limit: 2,
      offset: 4,
    });
  });
});
