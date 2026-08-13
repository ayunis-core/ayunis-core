import { Module } from '@nestjs/common';
import { AddFavoriteUseCase } from './application/use-cases/add-favorite/add-favorite.use-case';
import { ReorderFavoritesUseCase } from './application/use-cases/reorder-favorites/reorder-favorites.use-case';
import { RemoveFavoriteReferenceUseCase } from './application/use-cases/remove-favorite-reference/remove-favorite-reference.use-case';
import { LocalFavoritesRepositoryModule } from './infrastructure/persistence/local/local-favorites-repository.module';
import { FavoriteWorkspaceDeletionRequestedListener } from './application/listeners/workspace-deletion-requested.listener';
import { FavoriteThreadDeletionRequestedListener } from './application/listeners/thread-deletion-requested.listener';

@Module({
  imports: [LocalFavoritesRepositoryModule],
  providers: [
    AddFavoriteUseCase,
    ReorderFavoritesUseCase,
    RemoveFavoriteReferenceUseCase,
    FavoriteWorkspaceDeletionRequestedListener,
    FavoriteThreadDeletionRequestedListener,
  ],
  exports: [
    AddFavoriteUseCase,
    ReorderFavoritesUseCase,
    RemoveFavoriteReferenceUseCase,
  ],
})
export class FavoritesModule {}
