import type { UUID } from 'crypto';
import type { Share } from '../../domain/share.entity';
import type { SharedEntityType } from '../../domain/value-objects/shared-entity-type.enum';
import type { ShareScopeType } from '../../domain/value-objects/share-scope-type.enum';

export abstract class SharesRepository {
  /**
   * Creates a new resource share
   * @param share - Share entity to create
   * @returns void
   */
  abstract create(share: Share): Promise<void>;

  /**
   * Finds a share by its ID
   * @param id - ID of the share
   * @returns The share if found, null otherwise
   */
  abstract findById(id: UUID): Promise<Share | null>;

  /**
   * Deletes a specific share
   * @param share - Share entity to delete
   */
  abstract delete(share: Share): Promise<void>;

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

  /**
   * Finds all shares by entity type, scope type, and scope ID
   * @param entityType - Type of the entity (agent, prompt, etc.)
   * @param scopeType - Type of the scope (org, user)
   * @param scopeId - ID of the scope (orgId for org scopes)
   * @returns Array of shares matching the criteria
   */
  abstract findByEntityTypeAndScope(
    entityType: SharedEntityType,
    scopeType: ShareScopeType,
    scopeId: UUID,
  ): Promise<Share[]>;

  /**
   * Finds a specific share by entity type, entity ID, scope type, and scope ID
   * @param entityType - Type of the entity (agent, prompt, etc.)
   * @param entityId - ID of the specific entity
   * @param scopeType - Type of the scope (org, user)
   * @param scopeId - ID of the scope (orgId for org scopes)
   * @returns The share if found, null otherwise
   */
  abstract findByEntityAndScope(
    entityType: SharedEntityType,
    entityId: UUID,
    scopeType: ShareScopeType,
    scopeId: UUID,
  ): Promise<Share | null>;

  /**
   * Finds all shares for a specific entity type that are scoped to any of the provided team IDs
   * @param entityType - Type of the entity (agent, prompt, etc.)
   * @param teamIds - Array of team IDs to search for
   * @returns Array of shares matching the criteria
   */
  abstract findByEntityTypeAndTeamIds(
    entityType: SharedEntityType,
    teamIds: UUID[],
  ): Promise<Share[]>;

  /**
   * Finds all shares scoped to a specific team (regardless of entity type)
   * @param teamId - ID of the team
   * @returns Array of all shares scoped to the team
   */
  abstract findByTeamId(teamId: UUID): Promise<Share[]>;
}
