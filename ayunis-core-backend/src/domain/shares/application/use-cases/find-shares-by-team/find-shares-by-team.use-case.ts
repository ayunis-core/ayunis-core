import { Inject, Injectable, Logger } from '@nestjs/common';
import { SharesRepository } from '../../ports/shares-repository.port';
import { FindSharesByTeamQuery } from './find-shares-by-team.query';
import { Share } from '../../../domain/share.entity';

/**
 * Use case for finding all shares scoped to a specific team
 * Returns all shares (regardless of entity type) that are scoped to the team
 */
@Injectable()
export class FindSharesByTeamUseCase {
  private readonly logger = new Logger(FindSharesByTeamUseCase.name);

  constructor(
    @Inject(SharesRepository)
    private readonly sharesRepository: SharesRepository,
  ) {}

  /**
   * Execute the query to find all shares for a team
   * @param query - Query containing team ID
   * @returns Array of all shares scoped to the team
   */
  async execute(query: FindSharesByTeamQuery): Promise<Share[]> {
    this.logger.log('execute', { teamId: query.teamId });

    return this.sharesRepository.findByTeamId(query.teamId);
  }
}
