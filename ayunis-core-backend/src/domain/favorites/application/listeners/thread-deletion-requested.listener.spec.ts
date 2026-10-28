import type { UUID } from 'crypto';
import type { RemoveFavoriteReferenceUseCase } from '../use-cases/remove-favorite-reference/remove-favorite-reference.use-case';
import { ThreadDeletionRequestedEvent } from 'src/domain/threads/application/events/thread-deletion-requested.event';
import { FavoriteReferenceType } from '../../domain/value-objects/favorite-reference-type.enum';
import { FavoriteThreadDeletionRequestedListener } from './thread-deletion-requested.listener';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const ORG_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const THREAD_ID = '33333333-3333-4333-8333-333333333333' as UUID;

describe('FavoriteThreadDeletionRequestedListener', () => {
  it('defers favorite cleanup until the thread row is deleted', async () => {
    const removeFavoriteReferenceUseCase = { execute: jest.fn() };
    const listener = new FavoriteThreadDeletionRequestedListener(
      removeFavoriteReferenceUseCase as unknown as RemoveFavoriteReferenceUseCase,
    );
    const event = new ThreadDeletionRequestedEvent(THREAD_ID, USER_ID, ORG_ID);

    listener.handle(event);

    expect(removeFavoriteReferenceUseCase.execute).not.toHaveBeenCalled();
    const [cleanup] = event.takeCleanupTasks();
    await cleanup.run();
    expect(removeFavoriteReferenceUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceType: FavoriteReferenceType.Thread,
        referenceId: THREAD_ID,
      }),
    );
  });
});
