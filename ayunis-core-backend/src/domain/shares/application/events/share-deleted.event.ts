import type { UUID } from 'crypto';
import type { SharedEntityType } from '../../domain/value-objects/shared-entity-type.enum';
import type { ShareScopeType } from '../../domain/value-objects/share-scope-type.enum';

export interface RemainingShareScope {
  scopeType: ShareScopeType;
  scopeId: UUID;
}

export class ShareDeletedEvent {
  static readonly EVENT_NAME = 'share.deleted';

  constructor(
    public readonly entityType: SharedEntityType,
    public readonly entityId: UUID,
    public readonly ownerId: UUID,
    public readonly orgId: UUID,
    public readonly remainingScopes: RemainingShareScope[] = [],
  ) {}
}
