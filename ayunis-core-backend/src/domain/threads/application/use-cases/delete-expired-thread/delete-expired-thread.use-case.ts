import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ThreadDeletionService } from 'src/domain/threads/application/services/thread-deletion.service';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import { DeleteExpiredThreadCommand } from './delete-expired-thread.command';

/**
 * Deletes a chat that expired under the org's retention policy. Unlike
 * `DeleteThreadUseCase` it acts for no requesting user, so a workspace chat
 * whose creator is no longer a member of the workspace is deleted too.
 */
@Injectable()
export class DeleteExpiredThreadUseCase {
  private readonly logger = new Logger(DeleteExpiredThreadUseCase.name);

  constructor(private readonly threadDeletion: ThreadDeletionService) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(command: DeleteExpiredThreadCommand): Promise<void> {
    this.logger.log(
      { orgId: command.orgId, threadId: command.threadId },
      'Deleting expired thread',
    );
    await this.threadDeletion.delete({
      threadId: command.threadId,
      userId: command.userId,
      orgId: command.orgId,
    });
  }
}
