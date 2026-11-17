import type { UUID } from 'crypto';
import type { Favorite } from 'src/domain/favorites/domain/favorite.entity';
import type { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';

export abstract class FavoritesRepository {
  abstract findAllByUserId(userId: UUID): Promise<Favorite[]>;
  /**
   * Appends a favorite at the end of the user's order. Must be atomic and
   * idempotent: concurrent appends may not fail on the user/position
   * uniqueness constraint, and re-appending an existing reference is a no-op.
   */
  abstract append(
    userId: UUID,
    referenceType: FavoriteReferenceType,
    referenceId: UUID,
  ): Promise<void>;
  abstract remove(favorite: Favorite): Promise<void>;
  /** Removes the reference from every user's favorites, or only from `userId`'s. */
  abstract removeByReference(
    referenceType: FavoriteReferenceType,
    referenceId: UUID,
    userId?: UUID,
  ): Promise<void>;
  abstract reorder(userId: UUID, favoriteIds: UUID[]): Promise<void>;
}
