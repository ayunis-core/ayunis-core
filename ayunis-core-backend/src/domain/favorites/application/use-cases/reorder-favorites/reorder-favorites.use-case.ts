import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { Favorite } from '../../../domain/favorite.entity';
import { FavoritesRepository } from '../../ports/favorites-repository.port';
import { UnexpectedFavoriteError } from '../../favorites.errors';
import { ReorderFavoritesCommand } from './reorder-favorites.command';

@Injectable()
export class ReorderFavoritesUseCase {
  constructor(
    @InjectPinoLogger(ReorderFavoritesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly favoritesRepository: FavoritesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedFavoriteError)
  async execute(command: ReorderFavoritesCommand): Promise<Favorite[]> {
    this.logger.info(
      {
        count: command.favoriteIds.length,
      },
      'Reordering favorites',
    );
    const userId = this.requireUserId();
    const current = await this.favoritesRepository.findAllByUserId(userId);
    const currentById = new Map(
      current.map((favorite) => [favorite.id, favorite]),
    );
    const requested = this.resolveRequested(command.favoriteIds, currentById);
    const requestedIds = new Set(requested.map((favorite) => favorite.id));
    const ordered = [
      ...requested,
      ...current.filter((favorite) => !requestedIds.has(favorite.id)),
    ];

    await this.favoritesRepository.reorder(
      userId,
      ordered.map((favorite) => favorite.id),
    );
    return ordered.map((favorite, position) => {
      favorite.position = position;
      return favorite;
    });
  }

  private resolveRequested(
    favoriteIds: UUID[],
    currentById: Map<UUID, Favorite>,
  ): Favorite[] {
    return [...new Set(favoriteIds)].flatMap((id) => {
      const favorite = currentById.get(id);
      return favorite ? [favorite] : [];
    });
  }

  private requireUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    return userId;
  }
}
