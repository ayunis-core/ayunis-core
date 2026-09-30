import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { UnexpectedTeamMemberError } from 'src/iam/teams/application/team-members.errors';
import { FindAllUserIdsByTeamIdsQuery } from './find-all-user-ids-by-team-ids.query';

@Injectable()
export class FindAllUserIdsByTeamIdsUseCase {
  private readonly logger = new Logger(FindAllUserIdsByTeamIdsUseCase.name);

  constructor(private readonly teamMembersRepository: TeamMembersRepository) {}

  @HandleUnexpectedErrors(UnexpectedTeamMemberError)
  async execute(
    query: FindAllUserIdsByTeamIdsQuery,
  ): Promise<Map<UUID, UUID[]>> {
    this.logger.log(
      { organizationId: query.organizationId, teamCount: query.teamIds.length },
      'Finding user IDs by team IDs',
    );

    return await this.teamMembersRepository.findAllUserIdsByTeamIds(
      query.organizationId,
      query.teamIds,
    );
  }
}
