import { SharedEntityType } from '../../../domain/value-objects/shared-entity-type.enum';

/**
 * Query for finding shares by scope (for current user's org)
 */
export class FindSharesByScopeQuery {
  constructor(public readonly entityType: SharedEntityType) {}
}
