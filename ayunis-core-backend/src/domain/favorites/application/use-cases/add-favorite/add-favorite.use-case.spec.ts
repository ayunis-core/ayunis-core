import type { UUID } from 'crypto';
import type { FavoritesRepository } from 'src/domain/favorites/application/ports/favorites-repository.port';
import { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';
import { AddFavoriteCommand } from './add-favorite.command';
import { AddFavoriteUseCase } from './add-favorite.use-case';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const WORKSPACE_ID = '22222222-2222-4222-8222-222222222222' as UUID;

describe('AddFavoriteUseCase', () => {
  it('appends the reference for the user', async () => {
    const repository = createRepository();
    const useCase = new AddFavoriteUseCase(repository);

    await useCase.execute(
      new AddFavoriteCommand(
        USER_ID,
        FavoriteReferenceType.Workspace,
        WORKSPACE_ID,
      ),
    );

    expect(repository.append).toHaveBeenCalledWith(
      USER_ID,
      FavoriteReferenceType.Workspace,
      WORKSPACE_ID,
    );
  });
});

function createRepository(): jest.Mocked<FavoritesRepository> {
  return {
    findAllByUserId: jest.fn(),
    append: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn(),
    removeByReference: jest.fn(),
    reorder: jest.fn(),
  };
}
