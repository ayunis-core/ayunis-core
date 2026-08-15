import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedFavoriteError } from '../../favorites.errors';
import { FavoritesRepository } from '../../ports/favorites-repository.port';
import { FavoriteReferenceResolver } from '../../services/favorite-reference-resolver.service';
import type { FavoriteResult } from './favorite.result';

@Injectable()
export class FindFavoritesUseCase {
  constructor(
    @InjectPinoLogger(FindFavoritesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly favoritesRepository: FavoritesRepository,
    private readonly favoriteReferenceResolver: FavoriteReferenceResolver,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedFavoriteError)
  async execute(): Promise<FavoriteResult[]> {
    this.logger.info('Finding favorites');
    const userId = this.requireUserId();
    const favorites = await this.favoritesRepository.findAllByUserId(userId);
    return this.favoriteReferenceResolver.resolveAll(favorites, userId);
  }

  private requireUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    return userId;
  }
}
