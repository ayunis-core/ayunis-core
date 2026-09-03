import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { FavoritesRepository } from 'src/domain/favorites/application/ports/favorites-repository.port';
import { Favorite } from 'src/domain/favorites/domain/favorite.entity';
import { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';
import { ReorderFavoritesCommand } from './reorder-favorites.command';
import { ReorderFavoritesUseCase } from './reorder-favorites.use-case';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const FIRST_FAVORITE_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const SECOND_FAVORITE_ID = '33333333-3333-4333-8333-333333333333' as UUID;

describe('ReorderFavoritesUseCase', () => {
  it('places omitted owned favorites after the requested order', async () => {
    const first = createFavorite(FIRST_FAVORITE_ID, 0);
    const second = createFavorite(SECOND_FAVORITE_ID, 1);
    const repository = createRepository([first, second]);
    const useCase = new ReorderFavoritesUseCase(
      repository,
      createContextService(),
    );

    const result = await useCase.execute(
      new ReorderFavoritesCommand([SECOND_FAVORITE_ID]),
    );

    expect(result.map((favorite) => favorite.id)).toEqual([
      SECOND_FAVORITE_ID,
      FIRST_FAVORITE_ID,
    ]);
    expect(result.map((favorite) => favorite.position)).toEqual([0, 1]);
    expect(repository.reorder).toHaveBeenCalledWith(USER_ID, [
      SECOND_FAVORITE_ID,
      FIRST_FAVORITE_ID,
    ]);
  });
});

function createFavorite(id: UUID, position: number): Favorite {
  return new Favorite({
    id,
    userId: USER_ID,
    referenceType: FavoriteReferenceType.Thread,
    referenceId: randomUUID(),
    position,
  });
}

function createRepository(
  favorites: Favorite[],
): jest.Mocked<FavoritesRepository> {
  return {
    findAllByUserId: jest.fn().mockResolvedValue(favorites),
    append: jest.fn(),
    remove: jest.fn(),
    removeByReference: jest.fn(),
    reorder: jest.fn().mockResolvedValue(undefined),
  };
}

function createContextService(): jest.Mocked<ContextService> {
  return {
    get: jest.fn((key: string) => (key === 'userId' ? USER_ID : undefined)),
  } as unknown as jest.Mocked<ContextService>;
}
