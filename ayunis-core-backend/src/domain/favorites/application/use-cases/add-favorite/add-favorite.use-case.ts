import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedFavoriteError } from 'src/domain/favorites/application/favorites.errors';
import { FavoritesRepository } from 'src/domain/favorites/application/ports/favorites-repository.port';
import { AddFavoriteCommand } from './add-favorite.command';

@Injectable()
export class AddFavoriteUseCase {
  private readonly logger = new Logger(AddFavoriteUseCase.name);

  constructor(private readonly favoritesRepository: FavoritesRepository) {}

  @HandleUnexpectedErrors(UnexpectedFavoriteError)
  async execute(command: AddFavoriteCommand): Promise<void> {
    this.logger.log(
      {
        userId: command.userId,
        referenceType: command.referenceType,
        referenceId: command.referenceId,
      },
      'Adding favorite',
    );

    await this.favoritesRepository.append(
      command.userId,
      command.referenceType,
      command.referenceId,
    );
  }
}
