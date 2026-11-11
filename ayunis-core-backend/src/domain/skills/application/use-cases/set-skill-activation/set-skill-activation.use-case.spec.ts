jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { SetSkillActivationUseCase } from './set-skill-activation.use-case';

function setup() {
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const personal = new PersonalSkill({
    userId,
    name: 'Legal research',
    shortDescription: 'Research municipal law',
    instructions: 'Use authoritative sources.',
  });
  const workspace = new WorkspaceSkill({
    workspaceId,
    name: 'Permit review',
    shortDescription: 'Review permits',
    instructions: 'Use project rules.',
  });
  const repository = {
    findById: jest.fn(),
    activateSkill: jest.fn(),
    deactivateSkill: jest.fn(),
    activateWorkspaceSkill: jest.fn(),
    deactivateWorkspaceSkill: jest.fn(),
    update: jest.fn().mockImplementation((skill) => Promise.resolve(skill)),
  };
  const authorization = {
    requireRead: jest.fn(),
    requireWrite: jest.fn(),
  };
  const context = {
    get: jest.fn(
      (key: string) =>
        ({
          userId,
          orgId: randomUUID(),
          role: UserRole.ADMIN,
          systemRole: SystemRole.CUSTOMER,
        })[key],
    ),
  };
  const permission = { execute: jest.fn().mockResolvedValue(true) };
  return {
    userId,
    personal,
    workspace,
    repository,
    authorization,
    permission,
    useCase: new SetSkillActivationUseCase(
      repository as unknown as SkillRepository,
      authorization as unknown as SkillAuthorizationService,
      context as unknown as ContextService,
      permission as unknown as HasPermissionUseCase,
    ),
  };
}

describe(SetSkillActivationUseCase.name, () => {
  it('sets personal activation for the owner', async () => {
    const { useCase, personal, repository, authorization, userId } = setup();
    repository.findById.mockResolvedValue(personal);

    await expect(
      useCase.execute({ skillId: personal.id, isActive: true }),
    ).resolves.toBe(personal);

    expect(authorization.requireRead).toHaveBeenCalledWith(personal);
    expect(repository.activateSkill).toHaveBeenCalledWith(personal.id, userId);
  });

  it('sets workspace activation in workspace scope after write authorization', async () => {
    const { useCase, workspace, repository, authorization, permission } =
      setup();
    repository.findById.mockResolvedValue(workspace);

    await useCase.execute({ skillId: workspace.id, isActive: false });

    expect(authorization.requireWrite).toHaveBeenCalledWith(workspace);
    expect(permission.execute).toHaveBeenCalled();
    expect(repository.deactivateWorkspaceSkill).toHaveBeenCalledWith(
      workspace.id,
      workspace.workspaceId,
    );
  });

  it('switches a team skill off for everyone after manage authorization', async () => {
    const { useCase, repository, authorization } = setup();
    const team = new TeamSkill({
      teamId: randomUUID(),
      name: 'Council minutes',
      shortDescription: 'Drafts minutes.',
      instructions: 'Summarise.',
      isActive: true,
      isPinned: true,
    });
    repository.findById.mockResolvedValue(team);

    const result = await useCase.execute({ skillId: team.id, isActive: false });

    expect(authorization.requireWrite).toHaveBeenCalledWith(team);
    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false, isPinned: false }),
      team,
    );
    expect(result).toMatchObject({ isActive: false, isPinned: false });
    expect(repository.activateSkill).not.toHaveBeenCalled();
    expect(repository.deactivateSkill).not.toHaveBeenCalled();
  });

  it('does not change a team skill for members who cannot manage it', async () => {
    const { useCase, repository, authorization } = setup();
    const team = new TeamSkill({
      teamId: randomUUID(),
      name: 'Council minutes',
      shortDescription: 'Drafts minutes.',
      instructions: 'Summarise.',
    });
    repository.findById.mockResolvedValue(team);
    authorization.requireWrite.mockRejectedValue(new UnauthorizedAccessError());

    await expect(
      useCase.execute({ skillId: team.id, isActive: true }),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
