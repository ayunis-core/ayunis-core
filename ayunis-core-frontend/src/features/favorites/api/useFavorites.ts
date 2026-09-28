import {
  getFavoritesControllerFindAllQueryKey,
  useFavoritesControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { FavoritesControllerFindAll200Item } from '@/shared/api';

export type Favorite = FavoritesControllerFindAll200Item;
export type FavoriteReferenceType = Favorite['referenceType'];

export function useFavorites() {
  const query = useFavoritesControllerFindAll({
    query: {
      queryKey: getFavoritesControllerFindAllQueryKey(),
    },
  });

  return {
    favorites: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function isFavorite(
  favorites: Favorite[] | undefined,
  referenceId: string,
  referenceType: FavoriteReferenceType,
): boolean {
  return (
    favorites?.some(
      (favorite) =>
        favorite.referenceId === referenceId &&
        favorite.referenceType === referenceType,
    ) ?? false
  );
}
