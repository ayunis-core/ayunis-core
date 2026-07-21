import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrgsRepository } from '../../ports/orgs.repository';
import { DeleteOrgCommand } from './delete-org.command';
import { OrgError, OrgDeletionFailedError } from '../../orgs.errors';
import { OrgDeletionRequestedEvent } from '../../events/org-deletion-requested.event';
import { runDeferredCleanup } from 'src/common/events/run-deferred-cleanup';

@Injectable()
export class DeleteOrgUseCase {
  private readonly logger = new Logger(DeleteOrgUseCase.name);

  constructor(
    private readonly orgsRepository: OrgsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: DeleteOrgCommand): Promise<void> {
    this.logger.log('delete', { id: command.id });

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

      this.logger.debug('Deleting organization', { id: command.id });
      await this.orgsRepository.delete(command.id);
      this.logger.debug('Organization deleted successfully', {
        id: command.id,
      });

      await runDeferredCleanup(event.takeCleanupTasks(), this.logger);
    } catch (error) {
      if (error instanceof OrgError) {
        // Error already logged and properly formatted, just rethrow
        throw error;
      }
      this.logger.error('Failed to delete organization', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: command.id,
      });
      throw new OrgDeletionFailedError(
        command.id,
        'Failed to delete organization',
      );
    }
  }
}
