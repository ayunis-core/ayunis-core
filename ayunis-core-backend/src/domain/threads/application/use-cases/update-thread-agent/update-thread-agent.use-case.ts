import { Injectable, Logger } from '@nestjs/common';
import { UpdateThreadAgentCommand } from './update-thread-agent.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { ThreadError, ThreadUpdateError } from '../../threads.errors';

@Injectable()
export class UpdateThreadAgentUseCase {
  private readonly logger = new Logger(UpdateThreadAgentUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(command: UpdateThreadAgentCommand): Promise<void> {
    this.logger.log('execute', command);

    try {
      await this.threadsRepository.updateAgent({
        threadId: command.threadId,
        userId: command.userId,
        agentId: command.agentId,
      });
    } catch (error) {
      if (error instanceof ThreadError) throw error;
      this.logger.error('Error updating thread agent', error);
      throw new ThreadUpdateError(command.threadId, error as Error);
    }
  }
}
