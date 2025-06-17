import { Injectable, Logger, Inject } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { UpdateThreadInstructionCommand } from './update-thread-instruction.command';
import { ThreadUpdateError } from '../../threads.errors';

@Injectable()
export class UpdateThreadInstructionUseCase {
  private readonly logger = new Logger(UpdateThreadInstructionUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(command: UpdateThreadInstructionCommand): Promise<void> {
    this.logger.log('updateInstruction', {
      threadId: command.threadId,
      instruction: command.instruction,
    });

    try {
      await this.threadsRepository.updateInstruction(
        command.threadId,
        command.userId,
        command.instruction,
      );
    } catch (error) {
      this.logger.error('Failed to update thread instruction', {
        threadId: command.threadId,
        instruction: command.instruction,
        error,
      });
      throw error instanceof Error
        ? new ThreadUpdateError(command.threadId, error)
        : new ThreadUpdateError(command.threadId, new Error('Unknown error'));
    }
  }
}
