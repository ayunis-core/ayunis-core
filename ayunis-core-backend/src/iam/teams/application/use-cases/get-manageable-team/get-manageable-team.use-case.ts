import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import { GetTeamQuery } from 'src/iam/teams/application/use-cases/get-team/get-team.query';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import type { TeamWithAdmins } from './team-with-admins.view';

@Injectable()
export class GetManageableTeamUseCase {
  constructor(
    private readonly teamAccess: TeamAccessService,
    private readonly getTeam: GetTeamUseCase,
    private readonly teamMembersRepository: TeamMembersRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(query: GetTeamQuery): Promise<TeamWithAdmins> {
    await this.teamAccess.assertCanView({ teamId: query.teamId });
    const team = await this.getTeam.execute(query);
    const admins = await this.teamMembersRepository.findTeamAdminsByTeamIds([
      team.id,
    ]);
    return { team, teamAdmins: admins.get(team.id) ?? [] };
  }
}
