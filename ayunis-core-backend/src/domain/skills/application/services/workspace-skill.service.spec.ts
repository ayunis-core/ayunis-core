import type { Skill } from 'src/domain/skills/domain/skill';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { randomUUID } from 'crypto';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
} from 'src/domain/skills/application/skills.errors';

import { WorkspaceSkillService } from './workspace-skill.service';

function setup(skill: Skill) {
  const repository = {
    findByIds: jest.fn().mockResolvedValue([skill]),
    findByNameAndWorkspace: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockImplementation(async (updated) => updated),
    activateWorkspaceSkill: jest.fn(),
    deactivateWorkspaceSkill: jest.fn(),
    setWorkspaceSkillPinned: jest.fn(),
    getWorkspaceSkillStates: jest.fn().mockResolvedValue(new Map()),
  } as unknown as jest.Mocked<SkillRepository>;
  return { repository, service: new WorkspaceSkillService(repository) };
}

describe(WorkspaceSkillService.name, () => {
  it.each(['Invalid  name', ' leading space', 'Control\ncharacter'])(
    'translates invalid names: %s',
    async (name) => {
      const skill = new WorkspaceSkill({
        name: 'Permit check',
        shortDescription: 'Checks permits',
        instructions: 'Check permits.',
        workspaceId: randomUUID(),
      });
      const { service, repository } = setup(skill);
      await expect(
        service.updateProperties(skill.workspaceId, skill.id, {
          name,
          shortDescription: skill.shortDescription,
          instructions: skill.instructions,
        }),
      ).rejects.toBeInstanceOf(SkillInvalidInputError);
      expect(repository.update).not.toHaveBeenCalled();
    },
  );

  it('rejects renaming a workspace skill to a duplicate name', async () => {
    const workspaceId = randomUUID();
    const skill = new WorkspaceSkill({
      name: 'Original',
      shortDescription: 'Checks permits',
      instructions: 'Check permits.',
      workspaceId,
    });
    const { service, repository } = setup(skill);
    repository.findByNameAndWorkspace.mockResolvedValue(
      new WorkspaceSkill({
        name: 'Duplicate',
        shortDescription: 'Duplicate skill',
        instructions: 'Duplicate instructions.',
        workspaceId,
      }),
    );

    await expect(
      service.updateProperties(workspaceId, skill.id, {
        name: 'Duplicate',
        shortDescription: skill.shortDescription,
        instructions: skill.instructions,
      }),
    ).rejects.toBeInstanceOf(DuplicateSkillNameError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('deactivates and unpins a workspace skill', async () => {
    const workspaceId = randomUUID();
    const skill = new WorkspaceSkill({
      name: 'Permit check',
      shortDescription: 'Checks permits',
      instructions: 'Check permits.',
      workspaceId,
    });
    const { service, repository } = setup(skill);

    const updated = await service.setActive(workspaceId, skill.id, false);

    expect(updated).toBe(skill);
    expect(repository.deactivateWorkspaceSkill).toHaveBeenCalledWith(
      skill.id,
      workspaceId,
    );
  });

  it('does not pin an inactive workspace skill', async () => {
    const workspaceId = randomUUID();
    const skill = new WorkspaceSkill({
      name: 'Permit check',
      shortDescription: 'Checks permits',
      instructions: 'Check permits.',
      workspaceId,
    });
    const { service, repository } = setup(skill);

    await expect(
      service.setPinned(workspaceId, skill.id, true),
    ).rejects.toBeInstanceOf(SkillInvalidInputError);
    expect(repository.setWorkspaceSkillPinned).not.toHaveBeenCalled();
  });
});
