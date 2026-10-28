import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedFavoriteError } from 'src/domain/favorites/application/favorites.errors';
import { FavoritesRepository } from 'src/domain/favorites/application/ports/favorites-repository.port';
import { FavoriteReferenceResolver } from 'src/domain/favorites/application/services/favorite-reference-resolver.service';
import type { FavoriteResult } from './favorite.result';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class FindFavoritesUseCase {
  private readonly logger = new Logger(FindFavoritesUseCase.name);

  constructor(
    private readonly favoritesRepository: FavoritesRepository,
    private readonly favoriteReferenceResolver: FavoriteReferenceResolver,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedFavoriteError)
  async execute(): Promise<FavoriteResult[]> {
    this.logger.log('Finding favorites');
    const userId = this.requireUserId();
    const favorites = await this.favoritesRepository.findAllByUserId(userId);
    return this.favoriteReferenceResolver.resolveAll(favorites, userId);
  }

  private requireUserId(): UUID {
    const { userId } = getRequiredUserContext(this.contextService);
    return userId;
  }
}
