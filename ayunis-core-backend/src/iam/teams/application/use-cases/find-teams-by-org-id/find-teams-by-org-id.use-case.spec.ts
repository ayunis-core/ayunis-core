import type { UUID } from 'crypto';
import type { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { Team } from 'src/iam/teams/domain/team.entity';
import { FindTeamsByOrgIdQuery } from './find-teams-by-org-id.query';
import { FindTeamsByOrgIdUseCase } from './find-teams-by-org-id.use-case';

describe(FindTeamsByOrgIdUseCase.name, () => {
  it('returns every team in the explicitly requested organization', async () => {
    const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
    const teams = [new Team({ name: 'Research', orgId })];
    const repository = {
      findByOrgId: jest.fn().mockResolvedValue(teams),
    } as unknown as jest.Mocked<TeamsRepository>;

    const result = await new FindTeamsByOrgIdUseCase(repository).execute(
      new FindTeamsByOrgIdQuery(orgId),
    );

    expect(result).toEqual(teams);
    expect(repository.findByOrgId).toHaveBeenCalledWith(orgId);
  });
});
