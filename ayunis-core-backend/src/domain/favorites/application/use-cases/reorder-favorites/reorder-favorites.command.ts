import type { UUID } from 'crypto';

export class ReorderFavoritesCommand {
  constructor(public readonly favoriteIds: UUID[]) {}
}
