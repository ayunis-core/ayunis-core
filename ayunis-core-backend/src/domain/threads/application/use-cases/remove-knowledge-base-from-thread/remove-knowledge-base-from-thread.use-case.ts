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

    const currentKbs = thread.knowledgeBases ?? [];
    const isAssigned = currentKbs.some(
      (kb) => kb.id === command.knowledgeBaseId,
    );

    if (!isAssigned) {
      return;
    }

    const updatedIds = currentKbs
      .filter((kb) => kb.id !== command.knowledgeBaseId)
      .map((kb) => kb.id);

    await this.threadsRepository.updateKnowledgeBases({
      threadId: command.threadId,
      userId,
      knowledgeBaseIds: updatedIds,
    });
  }
}
