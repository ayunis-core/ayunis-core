jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_t: unknown, _p: string, d: PropertyDescriptor) => d,
}));

import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { RemoveEntitySharesUseCase } from 'src/domain/shares/application/use-cases/remove-entity-shares/remove-entity-shares.use-case';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import type { SkillOwnerChangeService } from 'src/domain/skills/application/services/skill-owner-change.service';
import {
  DuplicateSkillNameError,
  SkillNotFoundError,
  SkillOwnerChangeNotAllowedError,
} from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase } from 'src/domain/threads/application/use-cases/remove-knowledge-base-assignments-by-origin-skill/remove-knowledge-base-assignments-by-origin-skill.use-case';
import { ChangeSkillOwnerCommand } from './change-skill-owner.command';
import { ChangeSkillOwnerUseCase } from './change-skill-owner.use-case';

describe(ChangeSkillOwnerUseCase.name, () => {
  const userId = randomUUID();
  const orgId = randomUUID();
  const teamId = randomUUID();
  const params = {
    name: 'Council minutes',
    shortDescription: 'Drafts minutes.',
    instructions: 'Summarise.',
  };
  const personal = new PersonalSkill({ ...params, userId });
  const team = new TeamSkill({
    ...params,
    id: personal.id,
    teamId,
    isActive: true,
    isPinned: true,
  });

  function setup(
    existing: Skill,
    target: Skill,
    changed = true,
    unlinkedKnowledgeBaseIds: string[] = [],
  ) {
    const repository = {
      findById: jest.fn().mockResolvedValue(existing),
      findByNameAndOwner: jest.fn().mockResolvedValue(null),
      findByNameAndCollectiveOwner: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation((skill) => Promise.resolve(skill)),
      activateSkill: jest.fn(),
      deactivateSkill: jest.fn(),
      deactivateAllExceptOwner: jest.fn(),
      setSkillPinned: jest.fn(),
    };
    const authorization = { requireWrite: jest.fn(), requireCreate: jest.fn() };
    const planner = {
      plan: jest.fn().mockResolvedValue({
        changed,
        target,
        unlinkedKnowledgeBaseIds,
      }),
    };
    const removeShares = { execute: jest.fn() };
    const removeThreadAssignments = { execute: jest.fn() };
    const useCase = new ChangeSkillOwnerUseCase(
      repository as unknown as SkillRepository,
      authorization as unknown as SkillAuthorizationService,
      planner as unknown as SkillOwnerChangeService,
      removeShares as unknown as RemoveEntitySharesUseCase,
      removeThreadAssignments as unknown as RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase,
      {
        get: jest.fn(getFromUserContext({ userId, orgId })),
      } as unknown as ContextService,
    );
    return {
      repository,
      authorization,
      planner,
      removeShares,
      removeThreadAssignments,
      useCase,
    };
  }

  it('moves a personal skill into a team and narrows access to that team', async () => {
    const { useCase, repository, authorization, removeShares } = setup(
      personal,
      team,
    );

    const result = await useCase.execute(
      new ChangeSkillOwnerCommand(personal.id, { type: 'team', teamId }),
    );

    expect(repository.findById).toHaveBeenCalledWith(personal.id, {
      lock: true,
    });
    expect(authorization.requireWrite).toHaveBeenCalledWith(personal);
    expect(authorization.requireCreate).toHaveBeenCalledWith(team);
    expect(repository.findByNameAndCollectiveOwner).toHaveBeenCalledWith(
      params.name,
      { teamId },
    );
    expect(repository.update).toHaveBeenCalledWith(team, personal);
    expect(removeShares.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: SharedEntityType.SKILL,
        entityId: personal.id,
        ownerId: userId,
        remainingScopes: [{ scopeType: ShareScopeType.TEAM, scopeId: teamId }],
      }),
    );
    expect(result).toBe(team);
  });

  it('gives the mover the global state when a team skill becomes personal', async () => {
    const { useCase, repository, removeShares } = setup(team, personal);

    await useCase.execute(
      new ChangeSkillOwnerCommand(team.id, { type: 'personal' }),
    );

    expect(repository.deactivateAllExceptOwner).toHaveBeenCalledWith(
      team.id,
      userId,
    );
    expect(repository.activateSkill).toHaveBeenCalledWith(team.id, userId);
    expect(repository.setSkillPinned).toHaveBeenCalledWith(
      team.id,
      userId,
      true,
    );
    expect(removeShares.execute).toHaveBeenCalledWith(
      expect.objectContaining({ remainingScopes: [] }),
    );
  });

  it('switches it off for the mover when a switched-off team skill becomes personal', async () => {
    const inactive = new TeamSkill({ ...params, id: personal.id, teamId });
    const { useCase, repository } = setup(inactive, personal);

    await useCase.execute(
      new ChangeSkillOwnerCommand(inactive.id, { type: 'personal' }),
    );

    expect(repository.deactivateAllExceptOwner).toHaveBeenCalledWith(
      inactive.id,
      userId,
    );
    expect(repository.deactivateSkill).toHaveBeenCalledWith(
      inactive.id,
      userId,
    );
    expect(repository.activateSkill).not.toHaveBeenCalled();
  });

  it('clears per-user activation when a personal skill becomes collective', async () => {
    const { useCase, repository } = setup(personal, team);

    await useCase.execute(
      new ChangeSkillOwnerCommand(personal.id, { type: 'team', teamId }),
    );

    expect(repository.deactivateSkill).toHaveBeenCalledWith(
      personal.id,
      userId,
    );
    expect(repository.activateSkill).not.toHaveBeenCalled();
  });

  it('removes thread assignments of the knowledge bases it unlinks', async () => {
    const knowledgeBaseId = randomUUID();
    const { useCase, removeThreadAssignments } = setup(personal, team, true, [
      knowledgeBaseId,
    ]);

    await useCase.execute(
      new ChangeSkillOwnerCommand(personal.id, { type: 'team', teamId }),
    );

    expect(removeThreadAssignments.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        skillId: personal.id,
        userIds: null,
        knowledgeBaseId,
      }),
    );
  });

  it('changes nothing when the owner stays the same', async () => {
    const { useCase, repository, authorization, removeShares } = setup(
      team,
      team,
      false,
    );

    await expect(
      useCase.execute(
        new ChangeSkillOwnerCommand(team.id, { type: 'team', teamId }),
      ),
    ).resolves.toBe(team);
    expect(authorization.requireCreate).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
    expect(removeShares.execute).not.toHaveBeenCalled();
  });

  it('does not move the skill when the caller cannot manage the target', async () => {
    const { useCase, repository, authorization, removeShares } = setup(
      personal,
      team,
    );
    authorization.requireCreate.mockRejectedValue(
      new UnauthorizedAccessError(),
    );

    await expect(
      useCase.execute(
        new ChangeSkillOwnerCommand(personal.id, { type: 'team', teamId }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.update).not.toHaveBeenCalled();
    expect(removeShares.execute).not.toHaveBeenCalled();
  });

  it('rejects a name the target owner already uses', async () => {
    const { useCase, repository } = setup(personal, team);
    repository.findByNameAndCollectiveOwner.mockResolvedValue(
      new TeamSkill({ ...params, teamId }),
    );

    await expect(
      useCase.execute(
        new ChangeSkillOwnerCommand(personal.id, { type: 'team', teamId }),
      ),
    ).rejects.toBeInstanceOf(DuplicateSkillNameError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('keeps workspace skills in their workspace', async () => {
    const workspace = new WorkspaceSkill({
      ...params,
      workspaceId: randomUUID(),
    });
    const { useCase, planner, authorization } = setup(workspace, workspace);

    await expect(
      useCase.execute(
        new ChangeSkillOwnerCommand(workspace.id, { type: 'org' }),
      ),
    ).rejects.toBeInstanceOf(SkillOwnerChangeNotAllowedError);
    expect(authorization.requireWrite).toHaveBeenCalledWith(workspace);
    expect(planner.plan).not.toHaveBeenCalled();
  });

  it('hides workspace skills the caller cannot manage before saying they cannot move', async () => {
    const workspace = new WorkspaceSkill({
      ...params,
      workspaceId: randomUUID(),
    });
    const { useCase, authorization } = setup(workspace, workspace);
    authorization.requireWrite.mockRejectedValue(
      new SkillNotFoundError(workspace.id),
    );

    await expect(
      useCase.execute(
        new ChangeSkillOwnerCommand(workspace.id, { type: 'org' }),
      ),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
  });
});
