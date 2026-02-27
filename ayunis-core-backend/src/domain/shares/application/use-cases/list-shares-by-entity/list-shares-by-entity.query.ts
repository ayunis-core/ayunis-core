import type { UUID } from 'crypto';
import type { SharedEntityType } from '../../../domain/value-objects/shared-entity-type.enum';

/**
 * Query for listing all shares for a specific entity
 * Used internally by event handlers that need to find all shares
 * without user-context authorization checks
 */
export class ListSharesByEntityQuery {
  constructor(
    public readonly entityType: SharedEntityType,
    public readonly entityId: UUID,
  ) {}
}
