import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RemoveDirectKnowledgeBaseFromThreadsCommand } from './remove-direct-knowledge-base-from-threads.command';

@Injectable()
export class RemoveDirectKnowledgeBaseFromThreadsUseCase {
  constructor(
    @InjectPinoLogger(RemoveDirectKnowledgeBaseFromThreadsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly threadsRepository: ThreadsRepository,
  ) {}

  async execute(
    command: RemoveDirectKnowledgeBaseFromThreadsCommand,
  ): Promise<void> {
    this.logger.info(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        userCount: command.userIds.length,
      },
      'execute',
    );

    if (command.userIds.length === 0) {
      return;
    }

    await this.threadsRepository.removeDirectKnowledgeBaseAssignments({
      knowledgeBaseId: command.knowledgeBaseId,
      userIds: command.userIds,
    });
  }
}
