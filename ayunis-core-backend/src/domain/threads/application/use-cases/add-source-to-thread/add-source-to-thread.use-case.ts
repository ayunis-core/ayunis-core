import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { AddSourceCommand } from './add-source.command';
import { SourceAdditionError } from '../../threads.errors';
import { SourceAssignment } from '../../../domain/thread-source-assignment.entity';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class AddSourceToThreadUseCase {
  private readonly logger = new Logger(AddSourceToThreadUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(command: AddSourceCommand): Promise<void> {
    this.logger.log('addSource', {
      threadId: command.thread.id,
      sourceId: command.source.id,
    });
    try {
      if (!command.thread.sourceAssignments) {
        command.thread.sourceAssignments = [];
      }

      // Check if source already exists in thread
      const sourceExists = command.thread.sourceAssignments.some(
        (assignment) => assignment.source.id === command.source.id,
      );

      if (!sourceExists) {
        const sourceAssignment = new SourceAssignment({
          source: command.source,
        });
        command.thread.sourceAssignments.push(sourceAssignment);
        return await this.threadsRepository.updateSourceAssignments({
          threadId: command.thread.id,
          userId: command.thread.userId,
          sourceAssignments: command.thread.sourceAssignments,
        });
      }

      return;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new SourceAdditionError(command.thread.id, error as Error);
    }
  }
}
