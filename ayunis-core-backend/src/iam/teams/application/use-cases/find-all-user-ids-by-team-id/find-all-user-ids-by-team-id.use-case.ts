import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { TeamMembersRepository } from '../../ports/team-members.repository';
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
    this.logger.log('execute', { teamId: query.teamId });

    const result = await this.teamMembersRepository.findByTeamId(query.teamId, {
      limit: 1000,
      offset: 0,
    });

    return result.data.map((member) => member.userId);
  }
}
