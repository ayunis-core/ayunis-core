import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { GetTeamQuery } from './get-team.query';
import { Team } from '../../../domain/team.entity';
import { UnexpectedTeamError } from '../../teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { findTeamInOrganization } from '../../utils/find-team-in-organization';

@Injectable()
export class GetTeamUseCase {
  private readonly logger = new Logger(GetTeamUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(query: GetTeamQuery): Promise<Team> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('execute', { teamId: query.teamId, orgId });

    const team = await findTeamInOrganization(
      this.teamsRepository,
      query.teamId,
      orgId,
      this.logger,
    );

    this.logger.debug('Team retrieved successfully', {
      teamId: query.teamId,
    });

    return team;
  }
}
