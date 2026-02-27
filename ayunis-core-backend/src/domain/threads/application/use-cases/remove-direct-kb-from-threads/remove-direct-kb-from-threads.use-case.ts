import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RemoveDirectKbFromThreadsCommand } from './remove-direct-kb-from-threads.command';

@Injectable()
export class RemoveDirectKbFromThreadsUseCase {
  private readonly logger = new Logger(RemoveDirectKbFromThreadsUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(command: RemoveDirectKbFromThreadsCommand): Promise<void> {
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
