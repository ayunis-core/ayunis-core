import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FavoritesRepository } from 'src/domain/favorites/application/ports/favorites-repository.port';
import { UnexpectedFavoriteError } from 'src/domain/favorites/application/favorites.errors';
import { RemoveFavoriteReferenceCommand } from './remove-favorite-reference.command';

@Injectable()
export class RemoveFavoriteReferenceUseCase {
  private readonly logger = new Logger(RemoveFavoriteReferenceUseCase.name);

  constructor(private readonly favoritesRepository: FavoritesRepository) {}

  @HandleUnexpectedErrors(UnexpectedFavoriteError)
  async execute(command: RemoveFavoriteReferenceCommand): Promise<void> {
    this.logger.log(
      {
        referenceType: command.referenceType,
        referenceId: command.referenceId,
      },
      'Removing favorite reference',
    );
    await this.favoritesRepository.removeByReference(
      command.referenceType,
      command.referenceId,
    );
  }
}
