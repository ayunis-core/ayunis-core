import { UUID } from 'crypto';

/**
 * Abstract strategy for share authorization
 * Each entity type (agent, prompt, etc.) implements its own authorization logic
 */
export abstract class ShareAuthorizationStrategy {
  /**
   * Check if a user can view shares for an entity
   * @param entityId - ID of the entity
   * @param userId - ID of the user
   * @returns True if user can view shares
   */
  abstract canViewShares(entityId: UUID, userId: UUID): Promise<boolean>;

  /**
   * Check if a user can create a share for an entity
   * @param entityId - ID of the entity
   * @param userId - ID of the user
   * @returns True if user can create share
   */
  abstract canCreateShare(entityId: UUID, userId: UUID): Promise<boolean>;

  /**
   * Check if a user can delete a share
   * @param shareId - ID of the share
   * @param userId - ID of the user
   * @returns True if user can delete share
   */
  abstract canDeleteShare(shareId: UUID, userId: UUID): Promise<boolean>;
}
