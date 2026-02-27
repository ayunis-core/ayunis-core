import type { UUID } from 'crypto';
import type { SharedEntityType } from '../../../domain/value-objects/shared-entity-type.enum';

export class FindAllSharesByEntityQuery {
  constructor(
    public readonly entityId: UUID,
    public readonly entityType: SharedEntityType,
  ) {}
}
