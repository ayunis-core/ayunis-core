import { randomUUID, type UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import type { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import type { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { skillSlugName } from 'src/domain/skills/domain/skill-slug-prefix';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { FindSkillByNameQuery } from './find-skill-by-name.query';
import { FindSkillByNameUseCase } from './find-skill-by-name.use-case';

const orgId = randomUUID();
const bauamt = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as UUID;
const hauptamt = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb' as UUID;

function teamSkill(teamId: UUID) {
  return new TeamSkill({
    name: 'Protokoll erstellen',
    shortDescription: 'Protokolle',
    instructions: `Für ${teamId}`,
    teamId,
    orgId,
  });
}

describe('FindSkillByNameUseCase for team skills', () => {
  const inBauamt = teamSkill(bauamt);
  const inHauptamt = teamSkill(hauptamt);
  const useCase = new FindSkillByNameUseCase(
    {} as SkillRepository,
    {} as FindSharesByScopeUseCase,
    {} as ContextService,
    {
      findUsable: jest.fn().mockResolvedValue([inBauamt, inHauptamt]),
    } as unknown as CollectiveSkillRepository,
    {
      execute: jest.fn().mockResolvedValue({
        userId: randomUUID(),
        orgId,
        teamIds: [bauamt, hauptamt],
      }),
    } as unknown as GetOwnershipViewerUseCase,
  );

  it('finds the skill of the team the slug names', async () => {
    await expect(
      useCase.execute(
        new FindSkillByNameQuery(skillSlugName(inHauptamt), 'team'),
      ),
    ).resolves.toBe(inHauptamt);
    await expect(
      useCase.execute(
        new FindSkillByNameQuery(skillSlugName(inBauamt), 'team'),
      ),
    ).resolves.toBe(inBauamt);
  });

  it('does not guess between teams from the bare name', async () => {
    await expect(
      useCase.execute(new FindSkillByNameQuery('Protokoll erstellen', 'team')),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
  });
});
