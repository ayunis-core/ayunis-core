import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { DeleteOrgCommand } from './delete-org.command';
import {
  OrgError,
  OrgDeletionFailedError,
} from 'src/iam/orgs/application/orgs.errors';
import { OrgDeletionRequestedEvent } from 'src/iam/orgs/application/events/org-deletion-requested.event';
import { runDeferredCleanup } from 'src/common/events/run-deferred-cleanup';

@Injectable()
export class DeleteOrgUseCase {
  private readonly logger = new Logger(DeleteOrgUseCase.name);

  constructor(
    private readonly orgsRepository: OrgsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: DeleteOrgCommand): Promise<void> {
    this.logger.log({ id: command.id }, 'delete');

    try {
      // Listeners resolve org-scoped data the database cascade cannot reach
      // (MinIO blobs) and defer its cleanup; the irreversible purge runs only
      // after the row delete succeeds, so a failed delete never leaves a
      // surviving org whose blobs are already gone.
      const event = new OrgDeletionRequestedEvent(command.id);
      await this.eventEmitter.emitAsync(
        OrgDeletionRequestedEvent.EVENT_NAME,
        event,
      );

      this.logger.debug({ id: command.id }, 'Deleting organization');
      await this.orgsRepository.delete(command.id);
      this.logger.debug(
        {
          id: command.id,
        },
        'Organization deleted successfully',
      );

      await runDeferredCleanup(event.takeCleanupTasks(), this.logger);
    } catch (error) {
      if (error instanceof OrgError) {
        // Error already logged and properly formatted, just rethrow
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          id: command.id,
        },
        'Failed to delete organization',
      );
      throw new OrgDeletionFailedError(
        command.id,
        'Failed to delete organization',
      );
    }
  }
}
