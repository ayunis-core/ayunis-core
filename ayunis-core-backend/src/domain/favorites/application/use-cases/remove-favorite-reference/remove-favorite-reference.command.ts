import type { UUID } from 'crypto';
import type { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';

export class RemoveFavoriteReferenceCommand {
  constructor(
    public readonly referenceType: FavoriteReferenceType,
    public readonly referenceId: UUID,
    /** Only this user's favorite; every user's when omitted. */
    public readonly userId?: UUID,
  ) {}
}
