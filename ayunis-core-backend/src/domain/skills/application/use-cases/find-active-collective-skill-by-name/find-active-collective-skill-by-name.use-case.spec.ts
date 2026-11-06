import { randomUUID } from 'crypto';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { CollectiveSkillAccessService } from 'src/domain/skills/application/services/collective-skill-access.service';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { FindActiveCollectiveSkillByNameQuery } from './find-active-collective-skill-by-name.query';
import { FindActiveCollectiveSkillByNameUseCase } from './find-active-collective-skill-by-name.use-case';

describe(FindActiveCollectiveSkillByNameUseCase.name, () => {
  const owners = { orgId: randomUUID(), teamIds: [randomUUID(), randomUUID()] };
  const params = {
    name: 'Council minutes',
    shortDescription: 'Drafts minutes.',
    instructions: 'Summarise.',
    isActive: true,
  };
  const firstTeam = new TeamSkill({ ...params, teamId: owners.teamIds[0] });
  const secondTeam = new TeamSkill({ ...params, teamId: owners.teamIds[1] });
  const org = new OrgSkill({ ...params, orgId: owners.orgId });

  function setup() {
    const repository = {
      findActiveCollective: jest.fn((_owners: unknown, name: string) =>
        Promise.resolve(
          [org, firstTeam, secondTeam].filter((skill) => skill.name === name),
        ),
      ),
    };
    const useCase = new FindActiveCollectiveSkillByNameUseCase(
      repository as unknown as SkillRepository,
      {
        readableOwners: jest.fn().mockResolvedValue(owners),
      } as unknown as CollectiveSkillAccessService,
    );
    return { repository, useCase };
  }

  it('resolves a team slug to the first active team skill with that name', async () => {
    const { useCase, repository } = setup();

    await expect(
      useCase.execute(
        new FindActiveCollectiveSkillByNameQuery('Council minutes', 'team'),
      ),
    ).resolves.toBe(firstTeam);
    expect(repository.findActiveCollective).toHaveBeenCalledWith(
      owners,
      'Council minutes',
    );
  });

  it('resolves an org slug to the org skill', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(
        new FindActiveCollectiveSkillByNameQuery('Council minutes', 'org'),
      ),
    ).resolves.toBe(org);
  });

  it('fails when no readable active skill has the name', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(
        new FindActiveCollectiveSkillByNameQuery('Press release', 'team'),
      ),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
  });
});
