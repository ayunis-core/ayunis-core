jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_t: unknown, _p: string, d: PropertyDescriptor) => d,
}));

import type { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import { SkillNameLookupService } from 'src/domain/skills/application/services/skill-name-lookup.service';
import { randomUUID } from 'crypto';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { UpdateSkillCommand } from './update-skill.command';
import { UpdateSkillUseCase } from './update-skill.use-case';

describe(UpdateSkillUseCase.name, () => {
  it('loads ownership, authorizes workspace writes, and preserves owner scope', async () => {
    const skill = new WorkspaceSkill({
      workspaceId: randomUUID(),
      name: 'Old',
      shortDescription: 'Old',
      instructions: 'Old',
    });
    const repository = {
      findById: jest.fn().mockResolvedValue(skill),
      findByNameAndWorkspace: jest.fn().mockResolvedValue(null),
      update: jest
        .fn()
        .mockImplementation((updated) => Promise.resolve(updated)),
    };
    const authorization = { requireManage: jest.fn() };
    const useCase = new UpdateSkillUseCase(
      repository as unknown as SkillRepository,
      authorization as unknown as SkillAuthorizationService,
      new SkillNameLookupService(
        repository as unknown as SkillRepository,
        {} as CollectiveSkillRepository,
      ),
    );
    const updated = await useCase.execute(
      new UpdateSkillCommand({
        skillId: skill.id,
        name: 'New',
        shortDescription: 'New description',
        instructions: 'New instructions',
      }),
    );
    expect(authorization.requireManage).toHaveBeenCalledWith(skill);
    expect((updated as WorkspaceSkill).workspaceId).toBe(skill.workspaceId);
    expect(updated.name).toBe('New');
  });
});
