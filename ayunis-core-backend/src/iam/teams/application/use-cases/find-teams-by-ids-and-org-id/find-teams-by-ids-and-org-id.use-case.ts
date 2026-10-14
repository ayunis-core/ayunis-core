import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import type { Team } from 'src/iam/teams/domain/team.entity';

@Injectable()
export class FindTeamsByIdsAndOrgIdUseCase {
  private readonly logger = new Logger(FindTeamsByIdsAndOrgIdUseCase.name);
  constructor(private readonly teams: TeamsRepository) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(query: { teamIds: UUID[]; orgId: UUID }): Promise<Team[]> {
    this.logger.log(
      { orgId: query.orgId, teamCount: query.teamIds.length },
      'Finding organization teams by IDs',
    );
    return this.teams.findByIdsAndOrgId(query.teamIds, query.orgId);
  }
}
