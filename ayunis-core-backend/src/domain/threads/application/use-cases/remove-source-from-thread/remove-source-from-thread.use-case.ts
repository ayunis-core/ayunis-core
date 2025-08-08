import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { RemoveSourceCommand } from './remove-source.command';
import { SourceRemovalError, SourceNotFoundError } from '../../threads.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';

@Injectable()
export class RemoveSourceFromThreadUseCase {
  private readonly logger = new Logger(RemoveSourceFromThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
  ) {}

  async execute(command: RemoveSourceCommand): Promise<void> {
    this.logger.log('removeSource', {
      threadId: command.thread.id,
      sourceId: command.sourceId,
    });

    try {
      if (!command.thread.sourceAssignments) {
        throw new SourceNotFoundError(command.sourceId, command.thread.id);
      }

      const assignmentToRemove = command.thread.sourceAssignments.find(
        (assignment) => assignment.source.id === command.sourceId,
      );

      if (!assignmentToRemove) {
        throw new SourceNotFoundError(command.sourceId, command.thread.id);
      }

      // const updatedAssignments = command.thread.sourceAssignments.filter(
      //   (assignment) => assignment.source.id !== assignmentToRemove.source.id,
      // );

      // await this.threadsRepository.updateSourceAssignments({
      //   threadId: command.thread.id,
      //   userId: command.thread.userId,
      //   sourceAssignments: updatedAssignments,
      // });

      await this.deleteSourceUseCase.execute(
        new DeleteSourceCommand(assignmentToRemove.source),
      );
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
