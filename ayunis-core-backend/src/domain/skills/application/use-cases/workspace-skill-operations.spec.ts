import { randomUUID } from 'crypto';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
  SkillNotFoundError,
} from 'src/domain/skills/application/skills.errors';
import { WorkspaceSkillAccessService } from 'src/domain/skills/application/services/workspace-skill-access.service';
import { UpdateWorkspaceSkillUseCase } from './update-workspace-skill/update-workspace-skill.use-case';
import { SetWorkspaceSkillActivationUseCase } from './set-workspace-skill-activation/set-workspace-skill-activation.use-case';
import { SetWorkspaceSkillPinUseCase } from './set-workspace-skill-pin/set-workspace-skill-pin.use-case';
import { SetWorkspaceSkillKnowledgeBaseUseCase } from './set-workspace-skill-knowledge-base/set-workspace-skill-knowledge-base.use-case';

function setup() {
  const skill = new WorkspaceSkill({
    name: 'Permit check',
    shortDescription: 'Checks permits',
    instructions: 'Check permits.',
    workspaceId: randomUUID(),
  });
  const repository = {
    findByIds: jest.fn().mockResolvedValue([skill]),
    findByNameAndWorkspace: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockImplementation(async (updated: Skill) => updated),
    activateWorkspaceSkill: jest.fn(),
    deactivateWorkspaceSkill: jest.fn(),
    setWorkspaceSkillPinned: jest.fn(),
    getWorkspaceSkillStates: jest.fn().mockResolvedValue(new Map()),
  } as unknown as jest.Mocked<SkillRepository>;
  const access = new WorkspaceSkillAccessService(repository);
  return {
    skill,
    repository,
    access,
    update: new UpdateWorkspaceSkillUseCase(repository, access),
    activation: new SetWorkspaceSkillActivationUseCase(repository, access),
    pin: new SetWorkspaceSkillPinUseCase(repository, access),
  };
}

describe('workspace skill operations', () => {
  it.each(['Invalid  name', ' leading space', 'Control\ncharacter'])(
    'translates invalid names: %s',
    async (name) => {
      const { skill, update, repository } = setup();
      await expect(
        update.execute({
          workspaceId: skill.workspaceId,
          skillId: skill.id,
          values: { ...skill, name },
        }),
      ).rejects.toBeInstanceOf(SkillInvalidInputError);
      expect(repository.update).not.toHaveBeenCalled();
    },
  );
  it('rejects duplicate names before saving', async () => {
    const { skill, update, repository } = setup();
    repository.findByNameAndWorkspace.mockResolvedValue(
      new WorkspaceSkill({ ...skill, id: randomUUID(), name: 'Duplicate' }),
    );
    await expect(
      update.execute({
        workspaceId: skill.workspaceId,
        skillId: skill.id,
        values: { ...skill, name: 'Duplicate' },
      }),
    ).rejects.toBeInstanceOf(DuplicateSkillNameError);
    expect(repository.update).not.toHaveBeenCalled();
  });
  it.each([true, false])('sets activation to %s', async (isActive) => {
    const { skill, activation, repository } = setup();
    await expect(
      activation.execute({
        workspaceId: skill.workspaceId,
        skillId: skill.id,
        isActive,
      }),
    ).resolves.toBe(skill);
    expect(
      isActive
        ? repository.activateWorkspaceSkill
        : repository.deactivateWorkspaceSkill,
    ).toHaveBeenCalledWith(skill.id, skill.workspaceId);
  });
  it('does not pin inactive skills', async () => {
    const { skill, pin, repository } = setup();
    await expect(
      pin.execute({
        workspaceId: skill.workspaceId,
        skillId: skill.id,
        isPinned: true,
      }),
    ).rejects.toBeInstanceOf(SkillInvalidInputError);
    expect(repository.setWorkspaceSkillPinned).not.toHaveBeenCalled();
  });
  it('pins an active skill', async () => {
    const { skill, pin, repository } = setup();
    repository.getWorkspaceSkillStates.mockResolvedValue(
      new Map([[skill.id, { isActive: true, isPinned: false }]]),
    );
    await pin.execute({
      workspaceId: skill.workspaceId,
      skillId: skill.id,
      isPinned: true,
    });
    expect(repository.setWorkspaceSkillPinned).toHaveBeenCalledWith(
      skill.id,
      skill.workspaceId,
      true,
    );
  });
  it('passes the original snapshot when changing knowledge-base assignments', async () => {
    const { skill, access, repository } = setup();
    const knowledgeBaseId = randomUUID();
    const useCase = new SetWorkspaceSkillKnowledgeBaseUseCase(
      repository,
      access,
    );
    const result = await useCase.execute({
      workspaceId: skill.workspaceId,
      skillId: skill.id,
      knowledgeBaseId,
      assigned: true,
    });
    expect(result.knowledgeBaseIds).toEqual([knowledgeBaseId]);
    expect(repository.update).toHaveBeenCalledWith(result, skill);
  });
  it.each(['personal', 'another-workspace'])(
    'rejects %s ownership before mutation',
    async (scope) => {
      const { skill, activation, repository } = setup();
      const other =
        scope === 'personal'
          ? new PersonalSkill({
              name: skill.name,
              shortDescription: '',
              instructions: '',
              userId: randomUUID(),
            })
          : new WorkspaceSkill({ ...skill, workspaceId: randomUUID() });
      repository.findByIds.mockResolvedValue([other] as WorkspaceSkill[]);
      await expect(
        activation.execute({
          workspaceId: skill.workspaceId,
          skillId: skill.id,
          isActive: true,
        }),
      ).rejects.toBeInstanceOf(SkillNotFoundError);
      expect(repository.activateWorkspaceSkill).not.toHaveBeenCalled();
    },
  );
});
