import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import type { TeamAccess } from 'src/iam/teams/application/models/team-access.model';
import { GetTeamAccessQuery } from './get-team-access.query';

@Injectable()
export class GetTeamAccessUseCase {
  constructor(private readonly teamAccessService: TeamAccessService) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(query: GetTeamAccessQuery): Promise<TeamAccess> {
    return this.teamAccessService.forTeam(query.principal, query.teamId);
  }
}
