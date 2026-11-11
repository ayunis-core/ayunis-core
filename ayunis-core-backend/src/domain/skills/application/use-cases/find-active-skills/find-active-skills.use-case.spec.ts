import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { CollectiveSkillAccessService } from 'src/domain/skills/application/services/collective-skill-access.service';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { FindActiveSkillsQuery } from './find-active-skills.query';
import { FindActiveSkillsUseCase } from './find-active-skills.use-case';

describe(FindActiveSkillsUseCase.name, () => {
  const userId = randomUUID();
  const owners = { orgId: randomUUID(), teamIds: [randomUUID()] };
  const params = { shortDescription: 'Helps.', instructions: 'Help.' };

  it('adds the active team and org skills the user can read', async () => {
    const owned = new PersonalSkill({ ...params, name: 'Agenda', userId });
    const team = new TeamSkill({
      ...params,
      name: 'Building permits',
      teamId: owners.teamIds[0],
      isActive: true,
    });
    const org = new OrgSkill({
      ...params,
      name: 'Citizen letters',
      orgId: owners.orgId,
      isActive: true,
    });
    const repository = {
      findActiveByOwner: jest.fn().mockResolvedValue([owned]),
      findActiveCollective: jest.fn().mockResolvedValue([team, org]),
    };
    const collectiveAccess = {
      readableOwners: jest.fn().mockResolvedValue(owners),
    };
    const useCase = new FindActiveSkillsUseCase(
      repository as unknown as SkillRepository,
      {
        get: jest.fn(getFromUserContext({ userId })),
      } as unknown as ContextService,
      collectiveAccess as unknown as CollectiveSkillAccessService,
    );

    const active = await useCase.execute(new FindActiveSkillsQuery());

    expect(repository.findActiveCollective).toHaveBeenCalledWith(owners);
    expect(active).toEqual([owned, team, org]);
  });
});
