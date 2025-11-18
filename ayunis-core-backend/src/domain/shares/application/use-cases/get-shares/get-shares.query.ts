import { UUID } from 'crypto';
import { SharedEntityType } from '../../../domain/value-objects/shared-entity-type.enum';

/**
 * Query for getting shares for any entity type
 */
export class GetSharesQuery {
  constructor(
    public readonly entityId: UUID,
    public readonly entityType: SharedEntityType,
  ) {}
}
