import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import type { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import {
  ALL_TEAMS,
  type TeamAccessService,
} from 'src/iam/teams/application/services/team-access.service';
import { TeamAccessDeniedError } from 'src/iam/teams/application/team-members.errors';
import { Team } from 'src/iam/teams/domain/team.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ListManageableTeamsUseCase } from './list-manageable-teams.use-case';

describe('ListManageableTeamsUseCase', () => {
  const orgId = randomUUID();
  const bauamt = new Team({ name: 'Bauamt', orgId });
  const kaemmerei = new Team({ name: 'Kämmerei', orgId });
  let scope: typeof ALL_TEAMS | UUID[];
  let teamsRepository: { findByOrgId: jest.Mock; findByIdsAndOrgId: jest.Mock };
  let useCase: ListManageableTeamsUseCase;

  beforeEach(() => {
    teamsRepository = {
      findByOrgId: jest.fn(() => Promise.resolve([bauamt, kaemmerei])),
      findByIdsAndOrgId: jest.fn(() => Promise.resolve([bauamt])),
    };
    const teamMembersRepository = {
      countByTeamIds: jest.fn(() => Promise.resolve(new Map([[bauamt.id, 3]]))),
      findTeamAdminsByTeamIds: jest.fn(() =>
        Promise.resolve(
          new Map([[bauamt.id, [{ userId: randomUUID(), name: 'Jonas' }]]]),
        ),
      ),
    };
    const context = {
      get: jest.fn(
        (key: string) =>
          ({
            userId: randomUUID(),
            orgId,
            role: UserRole.USER,
            systemRole: SystemRole.CUSTOMER,
          })[key],
      ),
    };
    useCase = new ListManageableTeamsUseCase(
      teamsRepository as unknown as TeamsRepository,
      teamMembersRepository as unknown as TeamMembersRepository,
      {
        manageableTeamIds: () => Promise.resolve(scope),
      } as unknown as TeamAccessService,
      context as unknown as ContextService,
    );
  });

  it('lists every team for holders of a team permission', async () => {
    scope = ALL_TEAMS;

    const teams = await useCase.execute();

    expect(teams.map(({ team }) => team.name)).toEqual(['Bauamt', 'Kämmerei']);
    expect(teams[1].teamAdmins).toEqual([]);
  });

  it('lists only the administered teams with their admins for team admins', async () => {
    scope = [bauamt.id];

    const teams = await useCase.execute();

    expect(teamsRepository.findByIdsAndOrgId).toHaveBeenCalledWith(
      [bauamt.id],
      orgId,
    );
    expect(teams).toEqual([
      expect.objectContaining({
        memberCount: 3,
        teamAdmins: [expect.objectContaining({ name: 'Jonas' })],
      }),
    ]);
  });

  it('rejects members who manage no team', async () => {
    scope = [];

    await expect(useCase.execute()).rejects.toThrow(TeamAccessDeniedError);
  });
});
