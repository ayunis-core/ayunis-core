jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import type { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillNameLookupService } from 'src/domain/skills/application/services/skill-name-lookup.service';
import { SkillOwnerChangedError } from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { TransferSkillOwnershipCommand } from './transfer-skill-ownership.command';
import { TransferSkillOwnershipUseCase } from './transfer-skill-ownership.use-case';

const USER_ID = randomUUID();
const ORG_ID = randomUUID();
const TEAM_ID = randomUUID();

function setup(moved: boolean) {
  const skill = new PersonalSkill({
    name: 'Bauanträge prüfen',
    shortDescription: 'Prüft Bauanträge',
    instructions: 'Prüfe den Antrag.',
    userId: USER_ID,
  });
  const repository = {
    findById: jest.fn().mockResolvedValue(skill),
    isSkillActive: jest.fn().mockResolvedValue(false),
  } as unknown as jest.Mocked<SkillRepository>;
  const collectiveRepository = {
    transferFromPersonal: jest.fn().mockResolvedValue(moved),
    setActive: jest.fn(),
  } as unknown as jest.Mocked<CollectiveSkillRepository>;
  const names = {
    findSameOwnerByName: jest.fn().mockResolvedValue(null),
  } as unknown as jest.Mocked<SkillNameLookupService>;
  const useCase = new TransferSkillOwnershipUseCase(
    repository,
    collectiveRepository,
    names,
  );
  const command = new TransferSkillOwnershipCommand(skill.id, USER_ID, ORG_ID, {
    type: 'team',
    teamId: TEAM_ID,
  });
  return { useCase, command, collectiveRepository };
}

describe(TransferSkillOwnershipUseCase.name, () => {
  it('moves the skill only while the requester still owns it', async () => {
    const { useCase, command, collectiveRepository } = setup(true);

    await useCase.execute(command);

    expect(collectiveRepository.transferFromPersonal).toHaveBeenCalledWith(
      command.skillId,
      { teamId: TEAM_ID, orgId: ORG_ID, submittedByUserId: USER_ID },
    );
    expect(collectiveRepository.setActive).toHaveBeenCalledWith(
      command.skillId,
      USER_ID,
      false,
    );
  });

  it('fails when another handover moved the skill first', async () => {
    const { useCase, command, collectiveRepository } = setup(false);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      SkillOwnerChangedError,
    );
    expect(collectiveRepository.setActive).not.toHaveBeenCalled();
  });
});
