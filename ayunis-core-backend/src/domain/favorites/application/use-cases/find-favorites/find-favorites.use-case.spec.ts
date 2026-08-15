import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { FavoriteReferenceResolver } from '../../services/favorite-reference-resolver.service';
import type { FavoritesRepository } from '../../ports/favorites-repository.port';
import { FavoriteReferenceType } from '../../../domain/value-objects/favorite-reference-type.enum';
import { Favorite } from '../../../domain/favorite.entity';
import { FindFavoritesUseCase } from './find-favorites.use-case';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const WORKSPACE_ID = '22222222-2222-4222-8222-222222222222' as UUID;

describe('FindFavoritesUseCase', () => {
  it('loads and resolves the current user favorites', async () => {
    const favorite = new Favorite({
      userId: USER_ID,
      referenceType: FavoriteReferenceType.Workspace,
      referenceId: WORKSPACE_ID,
      position: 0,
    });
    const repository = {
      findAllByUserId: jest.fn().mockResolvedValue([favorite]),
    } as unknown as FavoritesRepository;
    const resolved = [{ id: favorite.id, name: 'Project Alpha' }];
    const resolver = {
      resolveAll: jest.fn().mockResolvedValue(resolved),
    } as unknown as FavoriteReferenceResolver;
    const context = {
      get: jest.fn().mockReturnValue(USER_ID),
    } as unknown as ContextService;
    const useCase = new FindFavoritesUseCase(
      createPinoLoggerMock(),
      repository,
      resolver,
      context,
    );

    await expect(useCase.execute()).resolves.toBe(resolved);
    expect(resolver.resolveAll).toHaveBeenCalledWith([favorite], USER_ID);
  });
});
