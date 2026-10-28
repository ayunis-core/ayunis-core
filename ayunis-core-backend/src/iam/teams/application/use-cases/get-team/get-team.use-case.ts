import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { GetTeamQuery } from './get-team.query';
import { Team } from 'src/iam/teams/domain/team.entity';
import {
  TeamNotFoundError,
  UnexpectedTeamError,
} from 'src/iam/teams/application/teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';

@Injectable()
export class GetTeamUseCase {
  private readonly logger = new Logger(GetTeamUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(query: GetTeamQuery): Promise<Team> {
    const orgId = getRequiredOrgId(this.contextService, query.orgId);

    this.logger.log({ teamId: query.teamId, orgId }, 'execute');

    const team = await this.teamsRepository.findById(query.teamId);

    if (!team) {
      this.logger.error({ teamId: query.teamId }, 'Team not found');
      throw new TeamNotFoundError(query.teamId);
    }

    if (team.orgId !== orgId) {
      this.logger.error(
        {
          teamId: query.teamId,
          teamOrgId: team.orgId,
          requestOrgId: orgId,
        },
        'Team does not belong to organization',
      );
      throw new TeamNotFoundError(query.teamId);
    }

    this.logger.debug(
      {
        teamId: query.teamId,
      },
      'Team retrieved successfully',
    );

    return team;
  }
}
