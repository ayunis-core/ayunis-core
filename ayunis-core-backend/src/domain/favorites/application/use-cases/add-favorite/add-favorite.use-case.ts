import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedFavoriteError } from '../../favorites.errors';
import { FavoritesRepository } from '../../ports/favorites-repository.port';
import { AddFavoriteCommand } from './add-favorite.command';

@Injectable()
export class AddFavoriteUseCase {
  constructor(
    @InjectPinoLogger(AddFavoriteUseCase.name)
    private readonly logger: PinoLogger,
    private readonly favoritesRepository: FavoritesRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedFavoriteError)
  async execute(command: AddFavoriteCommand): Promise<void> {
    this.logger.info(
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
