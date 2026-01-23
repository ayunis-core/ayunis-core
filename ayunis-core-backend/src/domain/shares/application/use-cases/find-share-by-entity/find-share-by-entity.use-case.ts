import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { SharesRepository } from '../../ports/shares-repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { FindShareByEntityQuery } from './find-share-by-entity.query';
import { Share } from '../../../domain/share.entity';
import { ShareScopeType } from '../../../domain/value-objects/share-scope-type.enum';
import { ListMyTeamsUseCase } from 'src/iam/teams/application/use-cases/list-my-teams/list-my-teams.use-case';

/**
 * Use case for finding a specific share by entity type and entity ID
 * Returns the share if it exists for the current user's organization or any of their teams
 */
@Injectable()
export class FindShareByEntityUseCase {
  private readonly logger = new Logger(FindShareByEntityUseCase.name);

  constructor(
    @Inject(SharesRepository)
    private readonly sharesRepository: SharesRepository,
    private readonly contextService: ContextService,
    private readonly listMyTeamsUseCase: ListMyTeamsUseCase,
  ) {}

  /**
   * Execute the query to find a share by entity
   * @param query - Query containing entity type and entity ID
   * @returns The share if found, null otherwise
   * @throws UnauthorizedException if user is not authenticated or has no organization
   */
  async execute(query: FindShareByEntityQuery): Promise<Share | null> {
    this.logger.log('execute', {
      entityType: query.entityType,
      entityId: query.entityId,
    });

    // Get current user's organization from context
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User organization not found in context');
    }

    // Check org share first
    const orgShare = await this.sharesRepository.findByEntityAndScope(
      query.entityType,
      query.entityId,
      ShareScopeType.ORG,
      orgId,
    );

    if (orgShare) {
      return orgShare;
    }

    // Check team shares for user's teams
    const userTeams = await this.listMyTeamsUseCase.execute();
    for (const team of userTeams) {
      const teamShare = await this.sharesRepository.findByEntityAndScope(
        query.entityType,
        query.entityId,
        ShareScopeType.TEAM,
        team.id,
      );
      if (teamShare) {
        return teamShare;
      }
    }

    return null;
  }
}
