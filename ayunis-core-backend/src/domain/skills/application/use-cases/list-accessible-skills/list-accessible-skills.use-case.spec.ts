import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillCreatorNameService } from 'src/domain/skills/application/services/skill-creator-name.service';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import type { CollectiveSkillAccessService } from 'src/domain/skills/application/services/collective-skill-access.service';
import { Paginated } from 'src/common/pagination/paginated.entity';
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
      {} as CollectiveSkillAccessService,
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

  describe('personal scope', () => {
    const userId = randomUUID();
    const owners = { orgId: randomUUID(), teamIds: [randomUUID()] };
    const params = { shortDescription: '', instructions: '' };
    const owned = new PersonalSkill({ ...params, name: 'Agenda', userId });
    const team = new TeamSkill({
      ...params,
      name: 'Building permits',
      teamId: owners.teamIds[0],
      isActive: true,
      isPinned: true,
    });
    const org = new OrgSkill({
      ...params,
      name: 'Citizen letters',
      orgId: owners.orgId,
    });

    function setup() {
      const repository = {
        findAllByOwner: jest.fn().mockResolvedValue([owned]),
        findAllCollective: jest.fn().mockResolvedValue([org, team]),
        findByIds: jest.fn().mockResolvedValue([]),
        findPaginatedAccessible: jest
          .fn()
          .mockResolvedValue(
            new Paginated({ data: [team], limit: 10, offset: 0, total: 1 }),
          ),
        getActiveSkillIds: jest.fn().mockResolvedValue(new Set([owned.id])),
        getPinnedSkillIds: jest.fn().mockResolvedValue(new Set()),
      };
      const collectiveAccess = {
        readableOwners: jest.fn().mockResolvedValue(owners),
      };
      const useCase = new ListAccessibleSkillsUseCase(
        repository as unknown as SkillRepository,
        {
          execute: jest.fn().mockResolvedValue([]),
        } as unknown as FindSharesByScopeUseCase,
        {
          resolveMany: jest.fn().mockResolvedValue(new Map()),
        } as unknown as SkillCreatorNameService,
        { get: jest.fn().mockReturnValue(userId) } as unknown as ContextService,
        {} as AssertWorkspaceReadAccessUseCase,
        collectiveAccess as unknown as CollectiveSkillAccessService,
      );
      return { repository, useCase };
    }

    it('includes readable team and org skills with their global state', async () => {
      const { useCase, repository } = setup();

      const result = await useCase.execute(
        new ListAccessibleSkillsQuery({ owner: { type: 'personal' } }),
      );

      expect(repository.findAllCollective).toHaveBeenCalledWith(owners);
      expect(result.data.map(({ skill }) => skill.name)).toEqual([
        'Agenda',
        'Building permits',
        'Citizen letters',
      ]);
      expect(result.data).toEqual([
        expect.objectContaining({ skill: owned, isActive: true }),
        expect.objectContaining({
          skill: team,
          isActive: true,
          isPinned: true,
          isShared: false,
          creatorName: null,
        }),
        expect.objectContaining({
          skill: org,
          isActive: false,
          isPinned: false,
          isShared: false,
        }),
      ]);
    });

    it('passes the readable owners to the paginated query', async () => {
      const { useCase, repository } = setup();

      const result = await useCase.execute(
        new ListAccessibleSkillsQuery({
          owner: { type: 'personal' },
          limit: 10,
        }),
      );

      expect(repository.findPaginatedAccessible).toHaveBeenCalledWith(
        userId,
        undefined,
        [],
        expect.objectContaining({ limit: 10 }),
        owners,
      );
      expect(result.data[0]).toMatchObject({ skill: team, isPinned: true });
    });
  });
});
