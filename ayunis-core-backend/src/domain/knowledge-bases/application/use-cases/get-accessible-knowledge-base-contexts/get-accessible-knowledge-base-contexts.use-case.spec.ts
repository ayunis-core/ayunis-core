import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { GetAccessibleKnowledgeBaseContextsUseCase } from './get-accessible-knowledge-base-contexts.use-case';

describe(GetAccessibleKnowledgeBaseContextsUseCase.name, () => {
  it('returns personal and workspace knowledge bases with scoped activation', async () => {
    const userId = randomUUID();
    const orgId = randomUUID();
    const workspaceId = randomUUID();
    const personal = new PersonalKnowledgeBase({
      userId,
      orgId,
      name: 'Personal guidance',
    });
    const workspace = new WorkspaceKnowledgeBase({
      workspaceId,
      orgId,
      name: 'Project guidance',
    });
    const repository = {
      findByIds: jest.fn().mockResolvedValue([personal, workspace]),
      getActiveIds: jest.fn().mockResolvedValue(new Set([personal.id])),
      getWorkspaceStates: jest
        .fn()
        .mockResolvedValue(new Map([[workspace.id, { isActive: true }]])),
      countSourcesByKnowledgeBaseIds: jest.fn().mockResolvedValue(new Map()),
    };
    const readAccess = { requireRead: jest.fn() };
    const principal = { userId, orgId };
    const context = {
      get: jest.fn((key: keyof typeof principal) => principal[key]),
    };
    const useCase = new GetAccessibleKnowledgeBaseContextsUseCase(
      repository as unknown as KnowledgeBaseRepository,
      readAccess as unknown as KnowledgeBaseReadAccessService,
      context as unknown as ContextService,
    );

    const result = await useCase.execute({
      knowledgeBaseIds: [personal.id, randomUUID(), workspace.id],
    });

    expect(result).toEqual([
      expect.objectContaining({ knowledgeBase: personal, isActive: true }),
      expect.objectContaining({ knowledgeBase: workspace, isActive: true }),
    ]);
    expect(readAccess.requireRead).toHaveBeenCalledTimes(2);
  });
});
