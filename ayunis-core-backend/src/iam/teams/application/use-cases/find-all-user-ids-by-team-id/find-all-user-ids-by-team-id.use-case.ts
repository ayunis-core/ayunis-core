import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { FindAllUserIdsByTeamIdQuery } from './find-all-user-ids-by-team-id.query';

const PAGE_SIZE = 1000;

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

    const allUserIds: UUID[] = [];
    let offset = 0;
    let hasMore = true;

    // Paginate through all team members to ensure we don't miss any
    while (hasMore) {
      const result = await this.teamMembersRepository.findByTeamId(
        query.teamId,
        {
          limit: PAGE_SIZE,
          offset,
        },
      );

      for (const member of result.data) {
        allUserIds.push(member.userId);
      }

      // Check if there are more pages
      hasMore = result.data.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    return allUserIds;
  }
}
