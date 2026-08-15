import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FavoritesRepository } from '../../ports/favorites-repository.port';
import { UnexpectedFavoriteError } from '../../favorites.errors';
import { RemoveFavoriteReferenceCommand } from './remove-favorite-reference.command';

@Injectable()
export class RemoveFavoriteReferenceUseCase {
  constructor(
    @InjectPinoLogger(RemoveFavoriteReferenceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly favoritesRepository: FavoritesRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedFavoriteError)
  async execute(command: RemoveFavoriteReferenceCommand): Promise<void> {
    this.logger.info(
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
