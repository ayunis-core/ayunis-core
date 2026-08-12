import type { UUID } from 'crypto';
import type { FindThreadsByIdsUseCase } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.use-case';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import type { FindWorkspacesByIdsUseCase } from 'src/domain/workspaces/application/use-cases/find-workspaces-by-ids/find-workspaces-by-ids.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { FavoriteReferenceType } from '../../domain/value-objects/favorite-reference-type.enum';
import { Favorite } from '../../domain/favorite.entity';
import { FavoriteReferenceResolver } from './favorite-reference-resolver.service';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const WORKSPACE_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const THREAD_ID = '33333333-3333-4333-8333-333333333333' as UUID;

describe('FavoriteReferenceResolver', () => {
  it('resolves ordered workspace and thread metadata as a discriminated result', async () => {
    const resolver = createResolver({
      workspaces: [
        {
          id: WORKSPACE_ID,
          name: 'Project Alpha',
          icon: 'folder',
          color: 'blue',
        },
      ],
      threads: [{ id: THREAD_ID, title: null }],
    });
    const favorites = [
      favorite(FavoriteReferenceType.Workspace, WORKSPACE_ID, 0),
      favorite(FavoriteReferenceType.Thread, THREAD_ID, 1),
    ];

    await expect(resolver.resolveAll(favorites, USER_ID)).resolves.toEqual([
      {
        id: favorites[0].id,
        position: 0,
        referenceType: FavoriteReferenceType.Workspace,
        referenceId: WORKSPACE_ID,
        name: 'Project Alpha',
        icon: 'folder',
        color: 'blue',
      },
      {
        id: favorites[1].id,
        position: 1,
        referenceType: FavoriteReferenceType.Thread,
        referenceId: THREAD_ID,
        name: null,
      },
    ]);
  });

  it('rejects a thread reference the user does not own', async () => {
    const resolver = createResolver({ threads: [] });

    await expect(
      resolver.assertAccessible(
        FavoriteReferenceType.Thread,
        THREAD_ID,
        USER_ID,
      ),
    ).rejects.toBeInstanceOf(ThreadNotFoundError);
  });

  it('rejects a workspace reference the user does not own', async () => {
    const resolver = createResolver({ workspaces: [] });

    await expect(
      resolver.assertAccessible(
        FavoriteReferenceType.Workspace,
        WORKSPACE_ID,
        USER_ID,
      ),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });
});

function createResolver(params: {
  workspaces?: unknown[];
  threads?: unknown[];
}): FavoriteReferenceResolver {
  return new FavoriteReferenceResolver(
    {
      execute: jest.fn().mockResolvedValue(params.workspaces ?? []),
    } as unknown as FindWorkspacesByIdsUseCase,
    {
      execute: jest.fn().mockResolvedValue(params.threads ?? []),
    } as unknown as FindThreadsByIdsUseCase,
  );
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
