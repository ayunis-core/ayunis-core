import {
  getFavoritesControllerFindAllQueryKey,
  useFavoritesControllerFindAll,
} from '@ayunis/api-client/endpoints';
import type { FavoritesControllerFindAll200Item } from '@ayunis/api-client';

export type Favorite = FavoritesControllerFindAll200Item;
export type FavoriteReferenceType = Favorite['referenceType'];

export function useFavorites({ enabled = true }: { enabled?: boolean } = {}) {
  const query = useFavoritesControllerFindAll({
    query: {
      queryKey: getFavoritesControllerFindAllQueryKey(),
      enabled,
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
