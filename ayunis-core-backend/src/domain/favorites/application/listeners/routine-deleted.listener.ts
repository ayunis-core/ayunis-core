import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RoutineDeletedEvent } from 'src/domain/routines/application/events/routine-deleted.event';
import { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';
import { RemoveFavoriteReferenceCommand } from 'src/domain/favorites/application/use-cases/remove-favorite-reference/remove-favorite-reference.command';
import { RemoveFavoriteReferenceUseCase } from 'src/domain/favorites/application/use-cases/remove-favorite-reference/remove-favorite-reference.use-case';

@Injectable()
export class FavoriteRoutineDeletedListener {
  private readonly logger = new Logger(FavoriteRoutineDeletedListener.name);

  constructor(
    private readonly removeFavoriteReferenceUseCase: RemoveFavoriteReferenceUseCase,
  ) {}

  // The deletion is already committed: a failure here must not fail it. The
  // favorites list hides routines that no longer exist anyway.
  @OnEvent(RoutineDeletedEvent.EVENT_NAME)
  async handle(event: RoutineDeletedEvent): Promise<void> {
    try {
      await this.removeFavoriteReferenceUseCase.execute(
        new RemoveFavoriteReferenceCommand(
          FavoriteReferenceType.Routine,
          event.routineId,
        ),
      );
    } catch (error) {
      this.logger.error(
        { routineId: event.routineId, err: error as Error },
        'Failed to remove the favorites of a deleted routine',
      );
    }
  }
}
