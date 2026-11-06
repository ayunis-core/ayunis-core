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
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
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
    update: jest.fn().mockImplementation((skill) => Promise.resolve(skill)),
  };
  const authorization = { requireRead: jest.fn(), requireWrite: jest.fn() };
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

  const orgSkill = (isActive: boolean) =>
    new OrgSkill({
      orgId: randomUUID(),
      name: 'Press release',
      shortDescription: 'Writes press releases.',
      instructions: 'Use the style guide.',
      isActive,
    });

  it('pins an active org skill for everyone after manage authorization', async () => {
    const { useCase, repository, authorization } = setup();
    const skill = orgSkill(true);
    repository.findById.mockResolvedValue(skill);

    const result = await useCase.execute({ skillId: skill.id, isPinned: true });

    expect(authorization.requireWrite).toHaveBeenCalledWith(skill);
    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({ isPinned: true }),
      skill,
    );
    expect(result).toMatchObject({ isActive: true, isPinned: true });
    expect(repository.setSkillPinned).not.toHaveBeenCalled();
  });

  it('rejects pinning an inactive org skill', async () => {
    const { useCase, repository } = setup();
    const skill = orgSkill(false);
    repository.findById.mockResolvedValue(skill);

    await expect(
      useCase.execute({ skillId: skill.id, isPinned: true }),
    ).rejects.toBeInstanceOf(SkillNotActiveError);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
