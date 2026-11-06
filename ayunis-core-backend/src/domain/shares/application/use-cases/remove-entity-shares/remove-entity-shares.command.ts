import type { UUID } from 'crypto';
import type { RemainingShareScope } from 'src/domain/shares/application/events/share-deleted.event';
import type { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';

export class RemoveEntitySharesCommand {
  constructor(
    public readonly entityType: SharedEntityType,
    public readonly entityId: UUID,
    /** The user who keeps access regardless of scopes (the new owner or mover). */
    public readonly ownerId: UUID,
    /** The audiences that still have access, e.g. the new owning team. */
    public readonly remainingScopes: RemainingShareScope[],
  ) {}
}
