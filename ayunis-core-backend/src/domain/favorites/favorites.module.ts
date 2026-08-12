import { forwardRef, Module } from '@nestjs/common';
import { AddFavoriteUseCase } from './application/use-cases/add-favorite/add-favorite.use-case';
import { FindFavoritesUseCase } from './application/use-cases/find-favorites/find-favorites.use-case';
import { ReorderFavoritesUseCase } from './application/use-cases/reorder-favorites/reorder-favorites.use-case';
import { RemoveFavoriteReferenceUseCase } from './application/use-cases/remove-favorite-reference/remove-favorite-reference.use-case';
import { ToggleFavoriteUseCase } from './application/use-cases/toggle-favorite/toggle-favorite.use-case';
import { LocalFavoritesRepositoryModule } from './infrastructure/persistence/local/local-favorites-repository.module';
import { FavoriteThreadDeletionRequestedListener } from './application/listeners/thread-deletion-requested.listener';
import { FavoriteWorkspaceDeletionRequestedListener } from './application/listeners/workspace-deletion-requested.listener';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ThreadsModule } from '../threads/threads.module';
import { FavoriteReferenceResolver } from './application/services/favorite-reference-resolver.service';
import { FavoritesController } from './presenters/http/favorites.controller';

// The reference resolver reads from workspaces and threads while workspaces
// (auto-favorite on create) and threads (favorite cleanup on cascade delete)
// call back into favorites, so every module reference on this cycle is a
// forwardRef — a plain reference would be undefined at import evaluation.
@Module({
  imports: [
    LocalFavoritesRepositoryModule,
    forwardRef(() => WorkspacesModule),
    forwardRef(() => ThreadsModule),
  ],
  controllers: [FavoritesController],
  providers: [
    AddFavoriteUseCase,
    FindFavoritesUseCase,
    ToggleFavoriteUseCase,
    ReorderFavoritesUseCase,
    RemoveFavoriteReferenceUseCase,
    FavoriteReferenceResolver,
    FavoriteWorkspaceDeletionRequestedListener,
    FavoriteThreadDeletionRequestedListener,
  ],
  exports: [
    AddFavoriteUseCase,
    FindFavoritesUseCase,
    ToggleFavoriteUseCase,
    ReorderFavoritesUseCase,
    RemoveFavoriteReferenceUseCase,
  ],
})
export class FavoritesModule {}
