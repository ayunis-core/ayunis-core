import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillCreatorNameService } from 'src/domain/skills/application/services/skill-creator-name.service';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { ListAccessibleSkillsQuery } from './list-accessible-skills.query';
import { ListAccessibleSkillsUseCase } from './list-accessible-skills.use-case';

describe(ListAccessibleSkillsUseCase.name, () => {
  it('authorizes and returns workspace skills with workspace-wide state', async () => {
    const userId = randomUUID();
    const workspaceId = randomUUID();
    const skill = new WorkspaceSkill({
      workspaceId,
      name: 'Permit review',
      shortDescription: 'Review permits',
      instructions: 'Use project rules.',
    });
    const repository = {
      findAllByWorkspaceId: jest.fn().mockResolvedValue([skill]),
      findPaginatedAccessible: jest.fn(),
      getWorkspaceSkillStates: jest
        .fn()
        .mockResolvedValue(
          new Map([[skill.id, { isActive: true, isPinned: true }]]),
        ),
    };
    const workspaceRead = { execute: jest.fn() };
    const useCase = new ListAccessibleSkillsUseCase(
      repository as unknown as SkillRepository,
      { execute: jest.fn() } as unknown as FindSharesByScopeUseCase,
      { resolveMany: jest.fn() } as unknown as SkillCreatorNameService,
      { get: jest.fn().mockReturnValue(userId) } as unknown as ContextService,
      workspaceRead as unknown as AssertWorkspaceReadAccessUseCase,
    );
    const result = await useCase.execute(
      new ListAccessibleSkillsQuery({
        owner: { type: 'workspace', workspaceId },
      }),
    );
    expect(workspaceRead.execute).toHaveBeenCalledWith({ workspaceId });
    expect(repository.findPaginatedAccessible).not.toHaveBeenCalled();
    expect(result).toMatchObject({ limit: 1, offset: 0, total: 1 });
    expect(result.data).toEqual([
      {
        skill,
        isActive: true,
        isPinned: true,
        isShared: false,
        creatorName: null,
      },
    ]);
  });
});
