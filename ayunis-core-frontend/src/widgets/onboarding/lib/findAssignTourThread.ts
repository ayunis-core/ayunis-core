import { isFavorite, type Favorite } from '@/features/favorites';

/**
 * The sidebar chat row the "move a chat into a workspace" step points at:
 * the first chat that is not pinned, since pinned chats render in the
 * favourites group without the handle. Shared by the sidebar and the step so
 * both agree on whether such a row exists.
 */
export function findAssignTourThread<T extends { id: string }>(
  threads: readonly T[],
  favorites: Favorite[] | undefined,
): T | undefined {
  return threads.find((thread) => !isFavorite(favorites, thread.id, 'thread'));
}
