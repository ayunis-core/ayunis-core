import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ThreadDeletionRequestedEvent } from 'src/domain/threads/application/events/thread-deletion-requested.event';
import { FavoriteReferenceType } from '../../domain/value-objects/favorite-reference-type.enum';
import { RemoveFavoriteReferenceCommand } from '../use-cases/remove-favorite-reference/remove-favorite-reference.command';
import { RemoveFavoriteReferenceUseCase } from '../use-cases/remove-favorite-reference/remove-favorite-reference.use-case';

@Injectable()
export class FavoriteThreadDeletionRequestedListener {
  constructor(
    private readonly removeFavoriteReferenceUseCase: RemoveFavoriteReferenceUseCase,
  ) {}

  @OnEvent(ThreadDeletionRequestedEvent.EVENT_NAME)
  handle(event: ThreadDeletionRequestedEvent): void {
    event.deferCleanup('remove thread favorite references', async () => {
      await this.removeFavoriteReferenceUseCase.execute(
        new RemoveFavoriteReferenceCommand(
          FavoriteReferenceType.Thread,
          event.threadId,
        ),
      );
    });
  }
}
