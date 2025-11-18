import { UUID } from 'crypto';
import { Share } from '../../domain/share.entity';
import { SharedEntityType } from '../../domain/value-objects/shared-entity-type.enum';

export abstract class SharesRepository {
  /**
   * Creates a new resource share
   * @param share - Share entity to create
   * @returns void
   */
  abstract create(share: Share): Promise<void>;

  /**
   * Deletes a specific share
   * @param id - ID of the share to delete
   * @param ownerId - ID of the share owner user
   */
  abstract delete(id: UUID, ownerId: UUID): Promise<void>;

  /**
   * Finds all shares for a specific entity
   * @param entityId - ID of the entity (agent, prompt, etc.)
   * @param entityType - Type of the entity
   * @returns Array of shares for the entity
   */
  abstract findByEntityIdAndType(
    entityId: UUID,
    entityType: SharedEntityType,
  ): Promise<Share[]>;
}
