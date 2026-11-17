import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkspaceMemberRemovedEvent } from 'src/domain/workspaces/application/events/workspace-member-removed.event';
import { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';
import { RemoveFavoriteReferenceCommand } from 'src/domain/favorites/application/use-cases/remove-favorite-reference/remove-favorite-reference.command';
import { RemoveFavoriteReferenceUseCase } from 'src/domain/favorites/application/use-cases/remove-favorite-reference/remove-favorite-reference.use-case';

@Injectable()
export class FavoriteWorkspaceMemberRemovedListener {
  private readonly logger = new Logger(
    FavoriteWorkspaceMemberRemovedListener.name,
  );

  constructor(
    private readonly removeFavoriteReferenceUseCase: RemoveFavoriteReferenceUseCase,
  ) {}

  // The removal is already committed: a failure here must not fail it. The
  // favorites list hides workspaces the user cannot open anyway.
  @OnEvent(WorkspaceMemberRemovedEvent.EVENT_NAME)
  async handle(event: WorkspaceMemberRemovedEvent): Promise<void> {
    try {
      await this.removeFavoriteReferenceUseCase.execute(
        new RemoveFavoriteReferenceCommand(
          FavoriteReferenceType.Workspace,
          event.workspaceId,
          event.userId,
        ),
      );
    } catch (error) {
      this.logger.error(
        {
          workspaceId: event.workspaceId,
          userId: event.userId,
          err: error as Error,
        },
        'Failed to remove the favorite of a removed workspace member',
      );
    }
  }
}
