import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { randomUUID } from 'crypto';
import { aUserContext } from 'src/common/context/testing/context.fixtures';
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
    const principal = aUserContext({ userId, orgId });
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

  it('returns team and org knowledge bases with their global state', async () => {
    const orgId = randomUUID();
    const team = new TeamKnowledgeBase({
      orgId,
      teamId: randomUUID(),
      name: 'Bauordnung',
      isActive: true,
    });
    const org = new OrgKnowledgeBase({ orgId, name: 'Satzungen' });
    const repository = {
      findByIds: jest.fn().mockResolvedValue([team, org]),
      getActiveIds: jest.fn(),
      getWorkspaceStates: jest.fn(),
      countSourcesByKnowledgeBaseIds: jest.fn().mockResolvedValue(new Map()),
    };
    const principal = aUserContext({ userId: randomUUID(), orgId });
    const useCase = new GetAccessibleKnowledgeBaseContextsUseCase(
      repository as unknown as KnowledgeBaseRepository,
      { requireRead: jest.fn() } as unknown as KnowledgeBaseReadAccessService,
      {
        get: jest.fn((key: keyof typeof principal) => principal[key]),
      } as unknown as ContextService,
    );

    const result = await useCase.execute({
      knowledgeBaseIds: [team.id, org.id],
    });

    expect(result).toEqual([
      expect.objectContaining({
        knowledgeBase: team,
        isActive: true,
        isShared: false,
      }),
      expect.objectContaining({
        knowledgeBase: org,
        isActive: false,
        isShared: false,
      }),
    ]);
    expect(repository.getActiveIds).not.toHaveBeenCalled();
    expect(repository.getWorkspaceStates).not.toHaveBeenCalled();
  });
});
