import type { UUID } from 'crypto';
import type { FavoriteReferenceType } from '../../../domain/value-objects/favorite-reference-type.enum';

export class RemoveFavoriteReferenceCommand {
  constructor(
    public readonly referenceType: FavoriteReferenceType,
    public readonly referenceId: UUID,
  ) {}
}
