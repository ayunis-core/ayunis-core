import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';
import { FavoriteReferenceType } from '../../domain/value-objects/favorite-reference-type.enum';
import { RemoveFavoriteReferenceCommand } from '../use-cases/remove-favorite-reference/remove-favorite-reference.command';
import { RemoveFavoriteReferenceUseCase } from '../use-cases/remove-favorite-reference/remove-favorite-reference.use-case';

@Injectable()
export class FavoriteWorkspaceDeletionRequestedListener {
  constructor(
    private readonly removeFavoriteReferenceUseCase: RemoveFavoriteReferenceUseCase,
  ) {}

  @OnEvent(WorkspaceDeletionRequestedEvent.EVENT_NAME)
  handle(event: WorkspaceDeletionRequestedEvent): void {
    event.deferCleanup('remove workspace favorite references', async () => {
      await this.removeFavoriteReferenceUseCase.execute(
        new RemoveFavoriteReferenceCommand(
          FavoriteReferenceType.Workspace,
          event.workspaceId,
        ),
      );
    });
  }
}
