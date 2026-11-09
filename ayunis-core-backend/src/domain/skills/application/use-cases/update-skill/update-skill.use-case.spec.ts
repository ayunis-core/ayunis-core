jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_t: unknown, _p: string, d: PropertyDescriptor) => d,
}));

import { randomUUID } from 'crypto';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { DuplicateSkillNameError } from 'src/domain/skills/application/skills.errors';
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
    const authorization = { requireWrite: jest.fn() };
    const useCase = new UpdateSkillUseCase(
      repository as unknown as SkillRepository,
      authorization as unknown as SkillAuthorizationService,
    );
    const updated = await useCase.execute(
      new UpdateSkillCommand({
        skillId: skill.id,
        name: 'New',
        shortDescription: 'New description',
        instructions: 'New instructions',
      }),
    );
    expect(authorization.requireWrite).toHaveBeenCalledWith(skill);
    expect((updated as WorkspaceSkill).workspaceId).toBe(skill.workspaceId);
    expect(updated.name).toBe('New');
  });

  it('checks name uniqueness within the team and keeps the global state', async () => {
    const teamId = randomUUID();
    const skill = new TeamSkill({
      teamId,
      name: 'Council minutes',
      shortDescription: 'Drafts minutes.',
      instructions: 'Summarise.',
      isActive: true,
      isPinned: true,
    });
    const repository = {
      findById: jest.fn().mockResolvedValue(skill),
      findByNameAndCollectiveOwner: jest.fn().mockResolvedValue(null),
      update: jest
        .fn()
        .mockImplementation((updated) => Promise.resolve(updated)),
    };
    const useCase = new UpdateSkillUseCase(
      repository as unknown as SkillRepository,
      { requireWrite: jest.fn() } as unknown as SkillAuthorizationService,
    );

    const updated = await useCase.execute(
      new UpdateSkillCommand({
        skillId: skill.id,
        name: 'Committee minutes',
        shortDescription: skill.shortDescription,
        instructions: skill.instructions,
      }),
    );

    expect(repository.findByNameAndCollectiveOwner).toHaveBeenCalledWith(
      'Committee minutes',
      { teamId },
    );
    expect(updated).toBeInstanceOf(TeamSkill);
    expect(updated).toMatchObject({ teamId, isActive: true, isPinned: true });
  });

  it('rejects renaming to a name another skill of the team uses', async () => {
    const teamId = randomUUID();
    const params = { shortDescription: '', instructions: '', teamId };
    const skill = new TeamSkill({ ...params, name: 'Council minutes' });
    const repository = {
      findById: jest.fn().mockResolvedValue(skill),
      findByNameAndCollectiveOwner: jest
        .fn()
        .mockResolvedValue(new TeamSkill({ ...params, name: 'Press release' })),
      update: jest.fn(),
    };
    const useCase = new UpdateSkillUseCase(
      repository as unknown as SkillRepository,
      { requireWrite: jest.fn() } as unknown as SkillAuthorizationService,
    );

    await expect(
      useCase.execute(
        new UpdateSkillCommand({
          skillId: skill.id,
          name: 'Press release',
          shortDescription: '',
          instructions: '',
        }),
      ),
    ).rejects.toBeInstanceOf(DuplicateSkillNameError);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
