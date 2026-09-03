import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { ListAccessibleSkillsUseCase } from 'src/domain/skills/application/use-cases/list-accessible-skills/list-accessible-skills.use-case';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import type { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { ListWorkspaceSkillCandidatesUseCase } from './list-workspace-skill-candidates.use-case';
import { ListWorkspaceSkillCandidatesQuery } from './list-workspace-skill-candidates.query';

describe('ListWorkspaceSkillCandidatesUseCase', () => {
  it('returns a paginated candidate page with attachment state', async () => {
    const workspaceId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
    const skillId = '223e4567-e89b-12d3-a456-426614174001' as UUID;
    const skill = new Skill({
      id: skillId,
      name: 'Citizen requests',
      shortDescription: 'Handles citizen requests',
      instructions: 'Use the request workflow',
      userId: '323e4567-e89b-12d3-a456-426614174002',
    });
    const page = new Paginated({
      data: [skill],
      limit: 2,
      offset: 4,
      total: 5,
    });
    const workspacesRepository = {
      findById: jest.fn().mockResolvedValue({}),
      getContextRefs: jest.fn().mockResolvedValue({
        skillIds: [skillId],
        knowledgeBases: [],
        sourceIds: [],
      }),
    } as unknown as jest.Mocked<WorkspacesRepository>;
    const listAccessibleSkillsUseCase = {
      execute: jest.fn().mockResolvedValue(page),
    } as unknown as jest.Mocked<ListAccessibleSkillsUseCase>;
    const contextService = {
      get: jest.fn().mockReturnValue('423e4567-e89b-12d3-a456-426614174003'),
    } as unknown as jest.Mocked<ContextService>;
    const useCase = new ListWorkspaceSkillCandidatesUseCase(
      workspacesRepository,
      listAccessibleSkillsUseCase,
      contextService,
    );

    const result = await useCase.execute(
      new ListWorkspaceSkillCandidatesQuery({
        workspaceId,
        search: 'citizen',
        limit: 2,
        offset: 4,
      }),
    );

    expect(result.data).toEqual([{ skill, isAttached: true }]);
    expect(result.total).toBe(5);
    expect(listAccessibleSkillsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'citizen',
        limit: 2,
        offset: 4,
      }),
    );
  });
});
