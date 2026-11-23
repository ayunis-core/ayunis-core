import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import { AddLoadedCapabilitiesToThreadCommand } from './add-loaded-capabilities-to-thread.command';

/**
 * Adds run capability ids to the thread's loaded set. Ids it already holds
 * are kept once. Throws `ThreadNotFoundError` when the user cannot reach the
 * thread.
 */
@Injectable()
export class AddLoadedCapabilitiesToThreadUseCase {
  private readonly logger = new Logger(
    AddLoadedCapabilitiesToThreadUseCase.name,
  );

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(command: AddLoadedCapabilitiesToThreadCommand): Promise<void> {
    this.logger.log(
      { threadId: command.threadId, capabilityIds: command.capabilityIds },
      'execute',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    await this.threadsRepository.addLoadedCapabilityIds({
      threadId: command.threadId,
      userId,
      capabilityIds: command.capabilityIds,
    });
  }
}
