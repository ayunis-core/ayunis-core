import type { UUID } from 'crypto';
import type { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';

/**
 * Query for getting shares for any entity type
 */
export class GetSharesQuery {
  constructor(
    public readonly entityId: UUID,
    public readonly entityType: SharedEntityType,
  ) {}
}
