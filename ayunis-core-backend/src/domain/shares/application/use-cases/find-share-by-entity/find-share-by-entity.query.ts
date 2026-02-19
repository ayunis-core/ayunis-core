import type { UUID } from 'crypto';
import type { SharedEntityType } from '../../../domain/value-objects/shared-entity-type.enum';

/**
 * Query for finding a specific share by entity type and entity ID
 */
export class FindShareByEntityQuery {
  constructor(
    public readonly entityType: SharedEntityType,
    public readonly entityId: UUID,
  ) {}
}
