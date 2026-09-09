jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { DeleteSkillCommand } from './delete-skill.command';
import { DeleteSkillUseCase } from './delete-skill.use-case';

describe(DeleteSkillUseCase.name, () => {
  it('derives workspace ownership from the persisted skill before deleting', async () => {
    const skill = new WorkspaceSkill({
      workspaceId: randomUUID(),
      name: 'Permit review',
      shortDescription: 'Review permits',
      instructions: 'Use project rules.',
    });
    const repository = {
      findById: jest.fn().mockResolvedValue(skill),
      delete: jest.fn(),
    };
    const authorization = { requireWrite: jest.fn() };
    const useCase = new DeleteSkillUseCase(
      repository as unknown as SkillRepository,
      authorization as unknown as SkillAuthorizationService,
    );
    await useCase.execute(new DeleteSkillCommand(skill.id));
    expect(authorization.requireWrite).toHaveBeenCalledWith(skill);
    expect(repository.delete).toHaveBeenCalledWith(skill.id);
  });

  it('returns not found before authorization when the skill does not exist', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
      delete: jest.fn(),
    };
    const authorization = { requireWrite: jest.fn() };
    const useCase = new DeleteSkillUseCase(
      repository as unknown as SkillRepository,
      authorization as unknown as SkillAuthorizationService,
    );
    await expect(
      useCase.execute(new DeleteSkillCommand(randomUUID())),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(authorization.requireWrite).not.toHaveBeenCalled();
  });
});
