import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RemoveKnowledgeBaseFromThreadCommand } from './remove-knowledge-base-from-thread.command';
import { ContextService } from 'src/common/context/services/context.service';
import { ThreadNotFoundError } from '../../threads.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class RemoveKnowledgeBaseFromThreadUseCase {
  private readonly logger = new Logger(
    RemoveKnowledgeBaseFromThreadUseCase.name,
  );

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: RemoveKnowledgeBaseFromThreadCommand): Promise<void> {
    this.logger.log('execute', {
      threadId: command.threadId,
      knowledgeBaseId: command.knowledgeBaseId,
    });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    const thread = await this.threadsRepository.findOne(
      command.threadId,
      userId,
    );

    if (!thread) {
      throw new ThreadNotFoundError(command.threadId, userId);
    }

    const currentAssignments = thread.knowledgeBaseAssignments ?? [];
    const isAssigned = currentAssignments.some(
      (a) => a.knowledgeBase.id === command.knowledgeBaseId,
    );

    if (!isAssigned) {
      return;
    }

    await this.threadsRepository.removeKnowledgeBaseAssignment({
      threadId: command.threadId,
      userId,
      knowledgeBaseId: command.knowledgeBaseId,
    });
  }
}
