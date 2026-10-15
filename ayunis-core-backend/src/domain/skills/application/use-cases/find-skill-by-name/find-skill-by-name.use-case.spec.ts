import { randomUUID, type UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { anOwnershipViewer } from 'src/domain/ownership/application/testing/ownership.fixtures';
import type { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { FindSkillByNameQuery } from './find-skill-by-name.query';
import { FindSkillByNameUseCase } from './find-skill-by-name.use-case';
import { skillSlugName } from 'src/domain/skills/domain/skill-slug-prefix';

const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;
const orgId = randomUUID();
const skillParams = { shortDescription: 'desc', instructions: 'instructions' };

function setup() {
  const skillRepository = { findByNameAndOwner: jest.fn() };
  const collectiveRepository = { findUsable: jest.fn().mockResolvedValue([]) };
  const contextService = { get: jest.fn().mockReturnValue(userId) };
  const useCase = new FindSkillByNameUseCase(
    skillRepository as unknown as SkillRepository,
    contextService as unknown as ContextService,
    collectiveRepository as unknown as CollectiveSkillRepository,
    {
      execute: jest
        .fn()
        .mockResolvedValue(anOwnershipViewer({ userId, orgId })),
    } as unknown as GetOwnershipViewerUseCase,
  );
  return { useCase, skillRepository, collectiveRepository, contextService };
}

describe(FindSkillByNameUseCase.name, () => {
  it('returns the owned skill with that name', async () => {
    const { useCase, skillRepository } = setup();
    const skill = new PersonalSkill({ ...skillParams, name: 'Notiz', userId });
    skillRepository.findByNameAndOwner.mockResolvedValue(skill);

    await expect(
      useCase.execute(new FindSkillByNameQuery('Notiz')),
    ).resolves.toBe(skill);
    expect(skillRepository.findByNameAndOwner).toHaveBeenCalledWith(
      'Notiz',
      userId,
    );
  });

  it('throws when the caller owns no skill with that name', async () => {
    const { useCase, skillRepository } = setup();
    skillRepository.findByNameAndOwner.mockResolvedValue(null);

    await expect(
      useCase.execute(new FindSkillByNameQuery('Unbekannt')),
    ).rejects.toThrow(SkillNotFoundError);
  });

  it('finds a usable team or organisation skill by its scope', async () => {
    const { useCase, collectiveRepository } = setup();
    const team = new TeamSkill({
      ...skillParams,
      name: 'Bauantrag',
      teamId: randomUUID(),
      orgId,
    });
    const org = new OrgSkill({ ...skillParams, name: 'Bauantrag', orgId });
    collectiveRepository.findUsable.mockResolvedValue([team, org]);

    await expect(
      useCase.execute(new FindSkillByNameQuery('Bauantrag', 'org')),
    ).resolves.toBe(org);
    await expect(
      useCase.execute(new FindSkillByNameQuery(skillSlugName(team), 'team')),
    ).resolves.toBe(team);
  });

  it('rejects unauthenticated callers', async () => {
    const { useCase, contextService } = setup();
    contextService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new FindSkillByNameQuery('Notiz')),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
