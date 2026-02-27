import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RemoveDirectKnowledgeBaseFromThreadsCommand } from './remove-direct-knowledge-base-from-threads.command';

@Injectable()
export class RemoveDirectKnowledgeBaseFromThreadsUseCase {
  private readonly logger = new Logger(
    RemoveDirectKnowledgeBaseFromThreadsUseCase.name,
  );

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(
    command: RemoveDirectKnowledgeBaseFromThreadsCommand,
  ): Promise<void> {
    this.logger.log('execute', {
      knowledgeBaseId: command.knowledgeBaseId,
      userCount: command.userIds.length,
    });

    if (command.userIds.length === 0) {
      return;
    }

    await this.threadsRepository.removeDirectKnowledgeBaseAssignments({
      knowledgeBaseId: command.knowledgeBaseId,
      userIds: command.userIds,
    });
  }
}
