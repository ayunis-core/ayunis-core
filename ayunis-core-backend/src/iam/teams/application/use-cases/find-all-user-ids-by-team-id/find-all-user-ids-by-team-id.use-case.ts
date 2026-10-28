import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { FindAllUserIdsByTeamIdQuery } from './find-all-user-ids-by-team-id.query';

/**
 * Use case for retrieving all user IDs belonging to a team.
 * Returns all IDs without pagination, intended for internal batch operations.
 */
@Injectable()
export class FindAllUserIdsByTeamIdUseCase {
  private readonly logger = new Logger(FindAllUserIdsByTeamIdUseCase.name);

  constructor(private readonly teamMembersRepository: TeamMembersRepository) {}

  async execute(query: FindAllUserIdsByTeamIdQuery): Promise<UUID[]> {
    this.logger.log({ teamId: query.teamId }, 'execute');

    return this.teamMembersRepository.findAllUserIdsByTeamId(query.teamId);
  }
}
