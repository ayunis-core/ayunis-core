import type { UUID } from 'crypto';
import type { RemoveFavoriteReferenceUseCase } from '../use-cases/remove-favorite-reference/remove-favorite-reference.use-case';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';
import { FavoriteReferenceType } from '../../domain/value-objects/favorite-reference-type.enum';
import { FavoriteWorkspaceDeletionRequestedListener } from './workspace-deletion-requested.listener';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const ORG_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const WORKSPACE_ID = '33333333-3333-4333-8333-333333333333' as UUID;

describe('FavoriteWorkspaceDeletionRequestedListener', () => {
  it('defers favorite cleanup until the workspace row is deleted', async () => {
    const removeFavoriteReferenceUseCase = { execute: jest.fn() };
    const listener = new FavoriteWorkspaceDeletionRequestedListener(
      removeFavoriteReferenceUseCase as unknown as RemoveFavoriteReferenceUseCase,
    );
    const event = new WorkspaceDeletionRequestedEvent(
      WORKSPACE_ID,
      USER_ID,
      ORG_ID,
    );

    listener.handle(event);

    expect(removeFavoriteReferenceUseCase.execute).not.toHaveBeenCalled();
    const [cleanup] = event.takeCleanupTasks();
    await cleanup.run();
    expect(removeFavoriteReferenceUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceType: FavoriteReferenceType.Workspace,
        referenceId: WORKSPACE_ID,
      }),
    );
  });
});
