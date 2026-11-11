import { randomUUID } from 'crypto';
import type { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import type { FindAllUserIdsByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import { FindUserIdsOutsideAudienceQuery } from './find-user-ids-outside-audience.query';
import { FindUserIdsOutsideAudienceUseCase } from './find-user-ids-outside-audience.use-case';

describe(FindUserIdsOutsideAudienceUseCase.name, () => {
  const orgId = randomUUID();
  const teamId = randomUUID();
  const owner = randomUUID();
  const teamMember = randomUUID();
  const colleague = randomUUID();

  function setup() {
    const findOrgUserIds = {
      execute: jest.fn().mockResolvedValue([owner, teamMember, colleague]),
    };
    const teamMembers = {
      findAllUserIdsByTeamId: jest.fn().mockResolvedValue([owner, teamMember]),
    };
    return new FindUserIdsOutsideAudienceUseCase(
      teamMembers as unknown as TeamMembersRepository,
      findOrgUserIds as unknown as FindAllUserIdsByOrgIdUseCase,
    );
  }

  it('returns everyone but the owner for a personal resource', async () => {
    await expect(
      setup().execute(
        new FindUserIdsOutsideAudienceQuery(orgId, {
          type: 'user',
          userId: owner,
        }),
      ),
    ).resolves.toEqual([teamMember, colleague]);
  });

  it('keeps the members of an owning team', async () => {
    await expect(
      setup().execute(
        new FindUserIdsOutsideAudienceQuery(orgId, { type: 'team', teamId }),
      ),
    ).resolves.toEqual([colleague]);
  });

  it('leaves nobody outside an organization-owned resource', async () => {
    await expect(
      setup().execute(
        new FindUserIdsOutsideAudienceQuery(orgId, { type: 'org', orgId }),
      ),
    ).resolves.toEqual([]);
  });
});
