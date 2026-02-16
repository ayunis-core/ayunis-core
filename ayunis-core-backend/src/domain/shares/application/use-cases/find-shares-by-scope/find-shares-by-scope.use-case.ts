import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { SharesRepository } from '../../ports/shares-repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { FindSharesByScopeQuery } from './find-shares-by-scope.query';
import { AgentShare, SkillShare, Share } from '../../../domain/share.entity';
import { ShareScopeType } from '../../../domain/value-objects/share-scope-type.enum';
import { ListMyTeamsUseCase } from 'src/iam/teams/application/use-cases/list-my-teams/list-my-teams.use-case';
import { SharedEntityType } from '../../../domain/value-objects/shared-entity-type.enum';

/**
 * Use case for finding shares by scope
 * Returns all shares of a given entity type that are scoped to the current user's organization
 * or any of the teams the user belongs to
 */
@Injectable()
export class FindSharesByScopeUseCase {
  private readonly logger = new Logger(FindSharesByScopeUseCase.name);

  constructor(
    @Inject(SharesRepository)
    private readonly sharesRepository: SharesRepository,
    private readonly contextService: ContextService,
    private readonly listMyTeamsUseCase: ListMyTeamsUseCase,
  ) {}

  /**
   * Execute the query to find shares by scope
   * @param query - Query containing entity type
   * @returns Array of shares for the current user's organization and teams (deduplicated by entity)
   * @throws UnauthorizedException if user is not authenticated or has no organization
   */
  async execute(query: FindSharesByScopeQuery): Promise<Share[]> {
    this.logger.log('execute', {
      entityType: query.entityType,
    });

    // Get current user's organization from context
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User organization not found in context');
    }

    // Fetch org shares
    const orgShares = await this.sharesRepository.findByEntityTypeAndScope(
      query.entityType,
      ShareScopeType.ORG,
      orgId,
    );

    // Fetch user's teams and their shares
    const userTeams = await this.listMyTeamsUseCase.execute();
    const teamIds = userTeams.map((team) => team.id);
    const teamShares = await this.sharesRepository.findByEntityTypeAndTeamIds(
      query.entityType,
      teamIds,
    );

    // Combine all shares
    const allShares = [...orgShares, ...teamShares];

    // Deduplicate by entityId (org shares have priority since they're first)
    return this.deduplicateByEntityId(allShares, query.entityType);
  }

  private deduplicateByEntityId(
    shares: Share[],
    entityType: SharedEntityType,
  ): Share[] {
    const seenEntityIds = new Set<string>();
    const uniqueShares: Share[] = [];

    for (const share of shares) {
      let entityId: string | undefined;

      if (
        entityType === SharedEntityType.AGENT &&
        share instanceof AgentShare
      ) {
        entityId = share.agentId;
      } else if (
        entityType === SharedEntityType.SKILL &&
        share instanceof SkillShare
      ) {
        entityId = share.skillId;
      }

      if (entityId && !seenEntityIds.has(entityId)) {
        seenEntityIds.add(entityId);
        uniqueShares.push(share);
      }
    }

    return uniqueShares;
  }
}
