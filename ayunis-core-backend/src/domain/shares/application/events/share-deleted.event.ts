import { UUID } from 'crypto';
import { SharedEntityType } from '../../domain/value-objects/shared-entity-type.enum';

export class ShareDeletedEvent {
  static readonly EVENT_NAME = 'share.deleted';

  constructor(
    public readonly entityType: SharedEntityType,
    public readonly entityId: UUID,
    public readonly ownerId: UUID,
  ) {}
}
