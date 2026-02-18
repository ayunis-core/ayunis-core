import {
  Inject,
  Injectable,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { SharesRepository } from '../../ports/shares-repository.port';
import { ShareAuthorizationFactory } from '../../factories/share-authorization.factory';
import { ContextService } from 'src/common/context/services/context.service';
import { GetSharesQuery } from './get-shares.query';
import { Share } from '../../../domain/share.entity';

/**
 * Use case for getting shares for any entity type
 * Delegates authorization to entity-specific strategies
 */
@Injectable()
export class GetSharesUseCase {
  private readonly logger = new Logger(GetSharesUseCase.name);

  constructor(
    private readonly authFactory: ShareAuthorizationFactory,
    @Inject(SharesRepository)
    private readonly sharesRepository: SharesRepository,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Execute the query to get shares
   * @param query - Query containing entity ID and type
   * @returns Array of shares for the entity
   * @throws UnauthorizedException if user is not authenticated
   * @throws ForbiddenException if user cannot view shares for the entity
   */
  async execute(query: GetSharesQuery): Promise<Share[]> {
    this.logger.log('execute', {
      entityId: query.entityId,
      entityType: query.entityType,
    });

    // Get current user from context
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Get appropriate authorization strategy for the entity type
    const authStrategy = this.authFactory.getStrategy(query.entityType);

    // Check if user can view shares for this entity
    const canView = await authStrategy.canViewShares(query.entityId, userId);
    if (!canView) {
      throw new ForbiddenException(
        `You do not have permission to view shares for this ${query.entityType.toLowerCase()}`,
      );
    }

    // Fetch and return shares
    return this.sharesRepository.findByEntityIdAndType(
      query.entityId,
      query.entityType,
    );
  }
}
