import type { UUID } from 'crypto';
import type { FavoriteReferenceType } from '../../../domain/value-objects/favorite-reference-type.enum';

export class AddFavoriteCommand {
  constructor(
    public readonly userId: UUID,
    public readonly referenceType: FavoriteReferenceType,
    public readonly referenceId: UUID,
  ) {}
}
