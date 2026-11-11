import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { DeleteThreadCommand } from './delete-thread.command';
import { ContextService } from 'src/common/context/services/context.service';
import { ThreadDeletionService } from 'src/domain/threads/application/services/thread-deletion.service';

@Injectable()
export class DeleteThreadUseCase {
  private readonly logger = new Logger(DeleteThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
    private readonly threadDeletion: ThreadDeletionService,
  ) {}

  async execute(command: DeleteThreadCommand): Promise<void> {
    this.logger.log({ threadId: command.id }, 'delete');

    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    const logContext = { threadId: command.id, userId };
    try {
      const thread = await this.threadsRepository.findOne(command.id, userId);

      if (!thread) {
        this.logger.warn(
          logContext,
          'Thread already deleted or not found, treating as success',
        );
        return;
      }

      await this.threadDeletion.delete({ threadId: command.id, userId, orgId });

      this.logger.log(logContext, 'Thread deleted successfully');
    } catch (error) {
      this.logger.error(
        { ...logContext, err: error as Error },
        'Failed to delete thread',
      );
      throw error;
    }
  }
}
