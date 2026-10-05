import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import {
  OrgDeletionFailedError,
  UnexpectedOrgError,
} from 'src/iam/orgs/application/orgs.errors';
import { OrgDeletionRequestedEvent } from 'src/iam/orgs/application/events/org-deletion-requested.event';
import { runDeferredCleanup } from 'src/common/events/run-deferred-cleanup';
import { DeleteOrgCommand } from './delete-org.command';

@Injectable()
export class DeleteOrgUseCase {
  private readonly logger = new Logger(DeleteOrgUseCase.name);
  constructor(
    private readonly orgs: OrgsRepository,
    private readonly events: EventEmitter2,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOrgError)
  async execute(command: DeleteOrgCommand): Promise<void> {
    this.logger.log({ id: command.id }, 'Deleting organisation');
    const event = new OrgDeletionRequestedEvent(command.id);
    await this.events.emitAsync(OrgDeletionRequestedEvent.EVENT_NAME, event);
    if (command.confirmationName === undefined)
      await this.orgs.delete(command.id);
    else await this.orgs.delete(command.id, command.confirmationName);
    const tasks = event.takeCleanupTasks();
    if (!command.requireCompleteCleanup) {
      await runDeferredCleanup(tasks, this.logger);
      return;
    }
    // Irreversible storage cleanup starts only after the database cascade succeeds.
    const results = await Promise.allSettled(tasks.map((task) => task.run()));
    if (results.some((result) => result.status === 'rejected')) {
      throw new OrgDeletionFailedError(
        command.id,
        'Organisation rows were removed, but external data cleanup is incomplete',
      );
    }
  }
}
