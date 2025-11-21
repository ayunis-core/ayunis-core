import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { SharesRepository } from '../../ports/shares-repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { FindSharesByScopeQuery } from './find-shares-by-scope.query';
import { Share } from '../../../domain/share.entity';
import { ShareScopeType } from '../../../domain/value-objects/share-scope-type.enum';

/**
 * Use case for finding shares by scope
 * Returns all shares of a given entity type that are scoped to the current user's organization
 */
@Injectable()
export class FindSharesByScopeUseCase {
  private readonly logger = new Logger(FindSharesByScopeUseCase.name);

  constructor(
    @Inject(SharesRepository)
    private readonly sharesRepository: SharesRepository,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Execute the query to find shares by scope
   * @param query - Query containing entity type
   * @returns Array of shares for the current user's organization
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

    // Fetch and return shares for the organization
    return await this.sharesRepository.findByEntityTypeAndScope(
      query.entityType,
      ShareScopeType.ORG,
      orgId,
    );
  }
}
