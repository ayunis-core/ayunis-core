import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Favorite } from '../../../domain/favorite.entity';
import { UnexpectedFavoriteError } from '../../favorites.errors';
import { FavoritesRepository } from '../../ports/favorites-repository.port';
import { FavoriteReferenceResolver } from '../../services/favorite-reference-resolver.service';
import { ToggleFavoriteCommand } from './toggle-favorite.command';

@Injectable()
export class ToggleFavoriteUseCase {
  private readonly logger = new Logger(ToggleFavoriteUseCase.name);

  constructor(
    private readonly favoritesRepository: FavoritesRepository,
    private readonly favoriteReferenceResolver: FavoriteReferenceResolver,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedFavoriteError)
  async execute(command: ToggleFavoriteCommand): Promise<void> {
    this.logger.log('Toggling favorite', {
      referenceType: command.referenceType,
      referenceId: command.referenceId,
    });
    const userId = this.requireUserId();
    const current = await this.favoritesRepository.findAllByUserId(userId);
    const existing = current.find(
      (favorite) =>
        favorite.referenceType === command.referenceType &&
        favorite.referenceId === command.referenceId,
    );
    if (existing) {
      // Deliberately no access check: the target may be gone or no longer
      // owned, and unfavoriting must keep working for such stale rows.
      await this.remove(existing, current);
      return;
    }
    await this.favoriteReferenceResolver.assertAccessible(
      command.referenceType,
      command.referenceId,
      userId,
    );
    await this.favoritesRepository.append(
      userId,
      command.referenceType,
      command.referenceId,
    );
  }

  private async remove(existing: Favorite, current: Favorite[]): Promise<void> {
    await this.favoritesRepository.remove(existing);
    const remainingIds = current
      .filter((favorite) => favorite.id !== existing.id)
      .map((favorite) => favorite.id);
    await this.favoritesRepository.reorder(existing.userId, remainingIds);
  }

  private requireUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    return userId;
  }
}
