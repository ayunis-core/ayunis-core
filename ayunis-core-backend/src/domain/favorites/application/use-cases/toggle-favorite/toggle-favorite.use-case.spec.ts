import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { FavoriteReferenceResolver } from '../../services/favorite-reference-resolver.service';
import type { FavoritesRepository } from '../../ports/favorites-repository.port';
import { FavoriteReferenceType } from '../../../domain/value-objects/favorite-reference-type.enum';
import { Favorite } from '../../../domain/favorite.entity';
import { ToggleFavoriteCommand } from './toggle-favorite.command';
import { ToggleFavoriteUseCase } from './toggle-favorite.use-case';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const WORKSPACE_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const THREAD_ID = '33333333-3333-4333-8333-333333333333' as UUID;

describe('ToggleFavoriteUseCase', () => {
  it('validates and appends a new favorite', async () => {
    const { useCase, repository, resolver } = setup();

    await useCase.execute(
      command(FavoriteReferenceType.Workspace, WORKSPACE_ID),
    );

    expect(resolver.assertAccessible).toHaveBeenCalledWith(
      FavoriteReferenceType.Workspace,
      WORKSPACE_ID,
      USER_ID,
    );
    expect(repository.append).toHaveBeenCalledWith(
      USER_ID,
      FavoriteReferenceType.Workspace,
      WORKSPACE_ID,
    );
  });

  it('removes an existing favorite and compacts the remaining order', async () => {
    const existing = favorite(FavoriteReferenceType.Thread, THREAD_ID, 0);
    const remaining = favorite(
      FavoriteReferenceType.Workspace,
      WORKSPACE_ID,
      1,
    );
    const { useCase, repository } = setup([existing, remaining]);

    await useCase.execute(command(FavoriteReferenceType.Thread, THREAD_ID));

    expect(repository.remove).toHaveBeenCalledWith(existing);
    expect(repository.reorder).toHaveBeenCalledWith(USER_ID, [remaining.id]);
    expect(repository.append).not.toHaveBeenCalled();
  });

  it('removes a stale favorite without requiring the target to be accessible', async () => {
    const existing = favorite(FavoriteReferenceType.Thread, THREAD_ID, 0);
    const { useCase, repository, resolver } = setup([existing]);
    resolver.assertAccessible.mockRejectedValue(new Error('gone'));

    await useCase.execute(command(FavoriteReferenceType.Thread, THREAD_ID));

    expect(resolver.assertAccessible).not.toHaveBeenCalled();
    expect(repository.remove).toHaveBeenCalledWith(existing);
  });
});

function setup(current: Favorite[] = []) {
  const repository = {
    findAllByUserId: jest.fn().mockResolvedValue(current),
    append: jest.fn(),
    remove: jest.fn(),
    reorder: jest.fn(),
  } as unknown as jest.Mocked<FavoritesRepository>;
  const resolver = {
    assertAccessible: jest.fn(),
  } as unknown as jest.Mocked<FavoriteReferenceResolver>;
  const context = {
    get: jest.fn().mockReturnValue(USER_ID),
  } as unknown as ContextService;
  return {
    repository,
    resolver,
    useCase: new ToggleFavoriteUseCase(repository, resolver, context),
  };
}

function favorite(
  referenceType: FavoriteReferenceType,
  referenceId: UUID,
  position: number,
): Favorite {
  return new Favorite({
    userId: USER_ID,
    referenceType,
    referenceId,
    position,
  });
}

function command(
  referenceType: FavoriteReferenceType,
  referenceId: UUID,
): ToggleFavoriteCommand {
  return new ToggleFavoriteCommand(referenceType, referenceId);
}
