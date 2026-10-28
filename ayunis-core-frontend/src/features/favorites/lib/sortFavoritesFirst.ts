import {
  isFavorite,
  type Favorite,
  type FavoriteReferenceType,
} from '@/features/favorites/api/useFavorites';

/** Stable: favorites keep their relative order, and so do the rest. */
export function sortFavoritesFirst<T extends { id: string }>(
  items: T[],
  favorites: Favorite[] | undefined,
  referenceType: FavoriteReferenceType,
): T[] {
  return [...items].sort(
    (a, b) =>
      Number(isFavorite(favorites, b.id, referenceType)) -
      Number(isFavorite(favorites, a.id, referenceType)),
  );
}
