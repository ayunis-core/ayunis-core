import type { UUID } from 'crypto';
import { BulkInviteTeamResolverService } from './bulk-invite-team-resolver.service';
import { CreateBulkInvitesCommand } from 'src/iam/invites/application/use-cases/create-bulk-invites/create-bulk-invites.command';
import type { FindTeamsByOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-org-id/find-teams-by-org-id.use-case';
import { Team } from 'src/iam/teams/domain/team.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

describe(BulkInviteTeamResolverService.name, () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;
  const researchId = '33333333-3333-3333-3333-333333333333' as UUID;
  const operationsId = '44444444-4444-4444-4444-444444444444' as UUID;
  const findTeams = {
    execute: jest
      .fn()
      .mockResolvedValue([
        new Team({ id: researchId, name: 'Research', orgId }),
        new Team({ id: operationsId, name: 'Operations', orgId }),
      ]),
  } as unknown as jest.Mocked<FindTeamsByOrgIdUseCase>;
  const service = new BulkInviteTeamResolverService(findTeams);

  beforeEach(() => jest.clearAllMocks());

  it('resolves multiple team names for each invite in one organization lookup', async () => {
    const command = new CreateBulkInvitesCommand({
      orgId,
      userId,
      invites: [
        {
          email: 'ada@example.com',
          role: UserRole.USER,
          teamNames: ['Research', 'Operations', 'Research'],
        },
        {
          email: 'grace@example.com',
          role: UserRole.MANAGER,
          teamNames: [],
        },
      ],
    });

    await expect(service.resolve(command)).resolves.toEqual({
      teamIdsByInvite: [[researchId, operationsId], []],
      errors: [],
    });
    expect(findTeams.execute).toHaveBeenCalledTimes(1);
  });

  it('reports unknown team names on their CSV row', async () => {
    const command = new CreateBulkInvitesCommand({
      orgId,
      userId,
      invites: [
        {
          email: 'ada@example.com',
          role: UserRole.USER,
          teamNames: ['Unknown team'],
        },
      ],
    });

    await expect(service.resolve(command)).resolves.toEqual({
      teamIdsByInvite: [[]],
      errors: [
        {
          row: 1,
          email: 'ada@example.com',
          errorCode: 'TEAM_NOT_FOUND',
          message: 'Unknown team: Unknown team',
        },
      ],
    });
  });

  it('skips the organization lookup when no teams were provided', async () => {
    const command = new CreateBulkInvitesCommand({
      orgId,
      userId,
      invites: [{ email: 'ada@example.com', role: UserRole.USER }],
    });

    await expect(service.resolve(command)).resolves.toEqual({
      teamIdsByInvite: [[]],
      errors: [],
    });
    expect(findTeams.execute).not.toHaveBeenCalled();
  });
});
