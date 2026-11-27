import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { DeleteThreadCommand } from './delete-thread.command';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ThreadDeletionService } from 'src/domain/threads/application/services/thread-deletion.service';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import { getCurrentSessionClient as getCurrentThreadClient } from 'src/common/context/current-session-client';

@Injectable()
export class DeleteThreadUseCase {
  private readonly logger = new Logger(DeleteThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
    private readonly threadDeletion: ThreadDeletionService,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(command: DeleteThreadCommand): Promise<void> {
    this.logger.log({ threadId: command.id }, 'delete');

    const { userId, orgId } = getRequiredUserContext(this.contextService);
    const logContext = { threadId: command.id, userId };

    const thread = await this.threadsRepository.findOneForSurface(
      command.id,
      userId,
      getCurrentThreadClient(this.contextService),
    );
    if (!thread) {
      this.logger.warn(
        logContext,
        'Thread already deleted or not found, treating as success',
      );
      return;
    }

    await this.threadDeletion.delete({ threadId: command.id, userId, orgId });
    this.logger.log(logContext, 'Thread deleted successfully');
  }
}
