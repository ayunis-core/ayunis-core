import { randomUUID } from 'crypto';
import type { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import type { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import { TeamAccessDeniedError } from 'src/iam/teams/application/team-members.errors';
import { GetTeamQuery } from 'src/iam/teams/application/use-cases/get-team/get-team.query';
import type { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { Team } from 'src/iam/teams/domain/team.entity';
import { GetManageableTeamUseCase } from './get-manageable-team.use-case';

describe('GetManageableTeamUseCase', () => {
  const team = new Team({ name: 'Bauamt', orgId: randomUUID() });
  const jonas = { userId: randomUUID(), name: 'Jonas Weber' };
  let assertCanView: jest.Mock;
  let getTeam: jest.Mock;
  let useCase: GetManageableTeamUseCase;

  beforeEach(() => {
    assertCanView = jest.fn();
    getTeam = jest.fn(() => Promise.resolve(team));
    useCase = new GetManageableTeamUseCase(
      { assertCanView } as unknown as TeamAccessService,
      { execute: getTeam } as unknown as GetTeamUseCase,
      {
        findTeamAdminsByTeamIds: () =>
          Promise.resolve(new Map([[team.id, [jonas]]])),
      } as unknown as TeamMembersRepository,
    );
  });

  it('returns the team with its team admins', async () => {
    await expect(useCase.execute(new GetTeamQuery(team.id))).resolves.toEqual({
      team,
      teamAdmins: [jonas],
    });
  });

  it('does not load the team for callers who may not view it', async () => {
    assertCanView.mockRejectedValue(new TeamAccessDeniedError(team.id));

    await expect(useCase.execute(new GetTeamQuery(team.id))).rejects.toThrow(
      TeamAccessDeniedError,
    );
    expect(getTeam).not.toHaveBeenCalled();
  });
});
