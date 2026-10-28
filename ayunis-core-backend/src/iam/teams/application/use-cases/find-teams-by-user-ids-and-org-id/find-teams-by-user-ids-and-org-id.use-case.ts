import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import type { Team } from 'src/iam/teams/domain/team.entity';

@Injectable()
export class FindTeamsByUserIdsAndOrgIdUseCase {
  private readonly logger = new Logger(FindTeamsByUserIdsAndOrgIdUseCase.name);

  constructor(private readonly teams: TeamsRepository) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(query: {
    userIds: UUID[];
    orgId: UUID;
  }): Promise<Map<UUID, Pick<Team, 'id' | 'name'>[]>> {
    this.logger.log(
      { orgId: query.orgId, userCount: query.userIds.length },
      'Finding organization teams by user IDs',
    );
    return this.teams.findByUserIdsAndOrgId(query.userIds, query.orgId);
  }
}
