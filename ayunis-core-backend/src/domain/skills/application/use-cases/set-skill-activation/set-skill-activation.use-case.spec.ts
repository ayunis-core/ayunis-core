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
  };
  const authorization = {
    requireRead: jest.fn(),
    requireWrite: jest.fn(),
  };
  const context = {
    get: jest.fn(
      (key: string) => ({ userId, orgId: randomUUID(), role: 'admin' })[key],
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
  it('sets personal activation for the authenticated user, including shared skills', async () => {
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
});
