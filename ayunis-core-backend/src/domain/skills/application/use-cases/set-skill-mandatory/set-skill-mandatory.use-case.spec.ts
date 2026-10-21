jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_t: unknown, _p: string, d: PropertyDescriptor) => d,
}));

import { randomUUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  SkillNotOrgOwnedError,
} from 'src/domain/skills/application/skills.errors';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { SetSkillMandatoryCommand } from './set-skill-mandatory.command';
import { SetSkillMandatoryUseCase } from './set-skill-mandatory.use-case';

const orgId = randomUUID();
const params = { shortDescription: 'desc', instructions: 'instructions' };

function setup(skill: Skill | null) {
  const repository = { findById: jest.fn().mockResolvedValue(skill) };
  const collectiveRepository = { setMandatory: jest.fn() };
  const authorization = {
    requireView: jest.fn().mockResolvedValue(undefined),
    requireManage: jest.fn().mockResolvedValue(undefined),
  };
  const useCase = new SetSkillMandatoryUseCase(
    repository as unknown as SkillRepository,
    collectiveRepository as unknown as CollectiveSkillRepository,
    authorization as unknown as SkillAuthorizationService,
  );
  return { useCase, collectiveRepository, authorization };
}

describe(SetSkillMandatoryUseCase.name, () => {
  it('makes an organisation skill mandatory for managers of organisation skills', async () => {
    const skill = new OrgSkill({ ...params, name: 'Datenschutz', orgId });
    const { useCase, collectiveRepository, authorization } = setup(skill);

    const result = await useCase.execute(
      new SetSkillMandatoryCommand(skill.id, true),
    );

    expect(result.isMandatory).toBe(true);
    expect(authorization.requireManage).toHaveBeenCalledWith(skill);
    expect(collectiveRepository.setMandatory).toHaveBeenCalledWith(
      skill.id,
      true,
    );
  });

  it('does nothing when the state already matches', async () => {
    const skill = new OrgSkill({
      ...params,
      name: 'Datenschutz',
      orgId,
      isMandatory: true,
    });
    const { useCase, collectiveRepository } = setup(skill);

    await useCase.execute(new SetSkillMandatoryCommand(skill.id, true));

    expect(collectiveRepository.setMandatory).not.toHaveBeenCalled();
  });

  it('rejects team skills with 400 after checking read access', async () => {
    const skill = new TeamSkill({
      ...params,
      name: 'Bauantrag',
      orgId,
      teamId: randomUUID(),
    });
    const { useCase, authorization } = setup(skill);

    await expect(
      useCase.execute(new SetSkillMandatoryCommand(skill.id, true)),
    ).rejects.toBeInstanceOf(SkillNotOrgOwnedError);
    expect(authorization.requireView).toHaveBeenCalledWith(skill);
  });

  it('passes on the manage check failure for readers without the right', async () => {
    const skill = new OrgSkill({ ...params, name: 'Datenschutz', orgId });
    const { useCase, authorization, collectiveRepository } = setup(skill);
    authorization.requireManage.mockRejectedValue(
      new UnauthorizedAccessError(),
    );

    await expect(
      useCase.execute(new SetSkillMandatoryCommand(skill.id, true)),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(collectiveRepository.setMandatory).not.toHaveBeenCalled();
  });

  it('reports a missing skill', async () => {
    const { useCase } = setup(null);

    await expect(
      useCase.execute(new SetSkillMandatoryCommand(randomUUID(), true)),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
  });
});
