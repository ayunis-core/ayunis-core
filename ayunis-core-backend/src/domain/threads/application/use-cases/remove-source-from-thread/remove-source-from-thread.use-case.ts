import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RemoveSourceCommand } from './remove-source.command';
import { SourceRemovalError, SourceNotFoundError } from '../../threads.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class RemoveSourceFromThreadUseCase {
  private readonly logger = new Logger(RemoveSourceFromThreadUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(command: RemoveSourceCommand): Promise<void> {
    this.logger.log('removeSource', {
      threadId: command.thread.id,
      sourceId: command.sourceId,
    });

    try {
      if (!command.thread.sourceAssignments) {
        throw new SourceNotFoundError(command.sourceId, command.thread.id);
      }

      const assignmentIndex = command.thread.sourceAssignments.findIndex(
        (assignment) => assignment.source.id === command.sourceId,
      );

      if (assignmentIndex === -1) {
        throw new SourceNotFoundError(command.sourceId, command.thread.id);
      }

      command.thread.sourceAssignments.splice(assignmentIndex, 1);
      await this.threadsRepository.update(command.thread);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('Failed to remove source from thread', {
        threadId: command.thread.id,
        sourceId: command.sourceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error instanceof Error
        ? new SourceRemovalError(command.thread.id, error)
        : new SourceRemovalError(command.thread.id, new Error('Unknown error'));
    }
  }
}
