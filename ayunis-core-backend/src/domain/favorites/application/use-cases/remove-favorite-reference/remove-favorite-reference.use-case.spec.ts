import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { UUID } from 'crypto';
import type { FavoritesRepository } from '../../ports/favorites-repository.port';
import { FavoriteReferenceType } from '../../../domain/value-objects/favorite-reference-type.enum';
import { RemoveFavoriteReferenceCommand } from './remove-favorite-reference.command';
import { RemoveFavoriteReferenceUseCase } from './remove-favorite-reference.use-case';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111' as UUID;

describe('RemoveFavoriteReferenceUseCase', () => {
  it('removes the deleted reference from every user favorite list', async () => {
    const repository = createRepository();
    const useCase = new RemoveFavoriteReferenceUseCase(
      createPinoLoggerMock(),
      repository,
    );

    await useCase.execute(
      new RemoveFavoriteReferenceCommand(
        FavoriteReferenceType.Workspace,
        WORKSPACE_ID,
      ),
    );

    expect(repository.removeByReference).toHaveBeenCalledWith(
      FavoriteReferenceType.Workspace,
      WORKSPACE_ID,
    );
  });
});

function createRepository(): jest.Mocked<FavoritesRepository> {
  return {
    findAllByUserId: jest.fn(),
    append: jest.fn(),
    remove: jest.fn(),
    removeByReference: jest.fn().mockResolvedValue(undefined),
    reorder: jest.fn(),
  };
}
