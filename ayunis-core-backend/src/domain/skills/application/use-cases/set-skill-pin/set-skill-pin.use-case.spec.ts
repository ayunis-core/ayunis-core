jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_t: unknown, _p: string, d: PropertyDescriptor) => d,
}));

import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { SkillNotActiveError } from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { SetSkillPinUseCase } from './set-skill-pin.use-case';

function setup() {
  const userId = randomUUID();
  const repository = {
    findById: jest.fn(),
    isSkillActive: jest.fn().mockResolvedValue(true),
    setSkillPinned: jest.fn(),
    getWorkspaceSkillStates: jest.fn(),
    setWorkspaceSkillPinned: jest.fn(),
  };
  const authorization = { requireRead: jest.fn(), requireWrite: jest.fn() };
  const context = {
    get: jest.fn(
      (key: string) => ({ userId, orgId: randomUUID(), role: 'admin' })[key],
    ),
  };
  const permission = { execute: jest.fn().mockResolvedValue(true) };
  const useCase = new SetSkillPinUseCase(
    repository as unknown as SkillRepository,
    authorization as unknown as SkillAuthorizationService,
    context as unknown as ContextService,
    permission as unknown as HasPermissionUseCase,
  );
  return { userId, repository, authorization, useCase };
}

describe(SetSkillPinUseCase.name, () => {
  it('sets personal pinning for the authenticated user', async () => {
    const { userId, repository, authorization, useCase } = setup();
    const skill = new PersonalSkill({
      userId: randomUUID(),
      name: 'Shared skill',
      shortDescription: '',
      instructions: '',
    });
    repository.findById.mockResolvedValue(skill);
    await useCase.execute({ skillId: skill.id, isPinned: true });
    expect(authorization.requireRead).toHaveBeenCalledWith(skill);
    expect(repository.setSkillPinned).toHaveBeenCalledWith(
      skill.id,
      userId,
      true,
    );
  });

  it('rejects pinning an inactive workspace skill', async () => {
    const { repository, useCase } = setup();
    const skill = new WorkspaceSkill({
      workspaceId: randomUUID(),
      name: 'Workspace skill',
      shortDescription: '',
      instructions: '',
    });
    repository.findById.mockResolvedValue(skill);
    repository.getWorkspaceSkillStates.mockResolvedValue(
      new Map([[skill.id, { isActive: false, isPinned: false }]]),
    );
    await expect(
      useCase.execute({ skillId: skill.id, isPinned: true }),
    ).rejects.toBeInstanceOf(SkillNotActiveError);
    expect(repository.setWorkspaceSkillPinned).not.toHaveBeenCalled();
  });
});
