import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import type { ToggleFavoriteDtoReferenceType } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export async function listFavoriteReferenceIds(
  api: APIRequestContext,
): Promise<string[]> {
  const favorites = await generatedApi.favoritesControllerFindAll({ api });
  return favorites.map((favorite) => favorite.referenceId);
}

export function toggleFavorite(
  api: APIRequestContext,
  referenceType: ToggleFavoriteDtoReferenceType,
  referenceId: string,
): Promise<void> {
  return generatedApi.favoritesControllerToggle(
    { referenceType, referenceId },
    { api },
  );
}

// Raw requests for asserting denied access; `apiURL` targets another backend
// (e.g. the one started with routines disabled).
export function requestFavorites(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/favorites`);
}

export function requestFavoriteToggle(
  api: APIRequestContext,
  referenceType: ToggleFavoriteDtoReferenceType,
  referenceId: string,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.patch(`${apiURL}/api/favorites/toggle`, {
    data: { referenceType, referenceId },
  });
}
