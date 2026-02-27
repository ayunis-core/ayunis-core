import { Inject, Injectable, Logger } from '@nestjs/common';
import { SharesRepository } from '../../ports/shares-repository.port';
import { ListSharesByEntityQuery } from './list-shares-by-entity.query';
import { Share } from '../../../domain/share.entity';

/**
 * Use case for listing all shares for a specific entity
 * This is intended for internal use by event handlers that need to
 * query shares without user-context authorization checks
 */
@Injectable()
export class ListSharesByEntityUseCase {
  private readonly logger = new Logger(ListSharesByEntityUseCase.name);

  constructor(
    @Inject(SharesRepository)
    private readonly sharesRepository: SharesRepository,
  ) {}

  /**
   * Execute the query to list all shares for an entity
   * @param query - Query containing entity type and entity ID
   * @returns Array of shares for the entity
   */
  async execute(query: ListSharesByEntityQuery): Promise<Share[]> {
    this.logger.log('execute', {
      entityType: query.entityType,
      entityId: query.entityId,
    });

    return await this.sharesRepository.findByEntityIdAndType(
      query.entityId,
      query.entityType,
    );
  }
}
