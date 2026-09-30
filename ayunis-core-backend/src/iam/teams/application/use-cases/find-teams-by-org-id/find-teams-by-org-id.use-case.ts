import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import type { Team } from 'src/iam/teams/domain/team.entity';
import { FindTeamsByOrgIdQuery } from './find-teams-by-org-id.query';

@Injectable()
export class FindTeamsByOrgIdUseCase {
  private readonly logger = new Logger(FindTeamsByOrgIdUseCase.name);

  constructor(private readonly teams: TeamsRepository) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(query: FindTeamsByOrgIdQuery): Promise<Team[]> {
    this.logger.log({ orgId: query.orgId }, 'Finding teams by organization');
    return this.teams.findByOrgId(query.orgId);
  }
}
