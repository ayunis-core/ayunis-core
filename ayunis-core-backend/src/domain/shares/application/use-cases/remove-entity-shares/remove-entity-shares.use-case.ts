import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Transactional } from '@nestjs-cls/transactional';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharesRepository } from 'src/domain/shares/application/ports/shares-repository.port';
import { UnexpectedShareError } from 'src/domain/shares/application/shares.errors';
import { RemoveEntitySharesCommand } from './remove-entity-shares.command';

/**
 * Removes all shares of an entity whose access is being narrowed, e.g. when it
 * moves to a team, and lets share listeners reconcile everyone outside the
 * remaining audience. Callers authorize the change; this performs no
 * share-permission check because the user is not unsharing.
 */
@Injectable()
export class RemoveEntitySharesUseCase {
  private readonly logger = new Logger(RemoveEntitySharesUseCase.name);

  constructor(
    private readonly repository: SharesRepository,
    private readonly context: ContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedShareError)
  async execute(command: RemoveEntitySharesCommand): Promise<void> {
    this.logger.log(
      { entityType: command.entityType, entityId: command.entityId },
      'Removing entity shares',
    );
    const { orgId } = getRequiredUserContext(this.context);
    const shares = await this.repository.findByEntityIdAndType(
      command.entityId,
      command.entityType,
    );
    for (const share of shares) {
      await this.repository.delete(share);
    }
    this.eventEmitter
      .emitAsync(
        ShareDeletedEvent.EVENT_NAME,
        new ShareDeletedEvent(
          command.entityType,
          command.entityId,
          command.ownerId,
          orgId,
          command.remainingScopes,
        ),
      )
      .catch((err: unknown) => {
        this.logger.error(
          { err: err as Error, entityId: command.entityId },
          'Failed to emit share deletion event',
        );
      });
  }
}
