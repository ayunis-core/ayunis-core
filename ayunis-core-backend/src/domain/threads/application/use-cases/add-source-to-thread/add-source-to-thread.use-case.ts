import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { AddSourceCommand } from './add-source.command';
import { SourceAdditionError } from '../../threads.errors';
import { SourceAssignment } from '../../../domain/thread-source-assignment.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { SourceAlreadyAssignedError } from '../../threads.errors';

@Injectable()
export class AddSourceToThreadUseCase {
  private readonly logger = new Logger(AddSourceToThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: AddSourceCommand): Promise<void> {
    this.logger.log('addSource', {
      threadId: command.thread.id,
      sourceId: command.source.id,
    });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Load fresh thread from DB to avoid stale in-memory duplicate checks
      const freshThread = await this.threadsRepository.findOne(
        command.thread.id,
        userId,
      );
      if (!freshThread) {
        throw new SourceAdditionError(
          command.thread.id,
          new Error('Thread not found'),
        );
      }

      const currentAssignments = freshThread.sourceAssignments ?? [];

      // Check if source already exists in thread (against DB state)
      const sourceExists = currentAssignments.some(
        (assignment) => assignment.source.id === command.source.id,
      );

      if (sourceExists) {
        throw new SourceAlreadyAssignedError(command.source.id);
      }

      const sourceAssignment = new SourceAssignment({
        source: command.source,
        originSkillId: command.originSkillId,
      });
      const updatedAssignments = [...currentAssignments, sourceAssignment];
      return await this.threadsRepository.updateSourceAssignments({
        threadId: command.thread.id,
        userId,
        sourceAssignments: updatedAssignments,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('addSource', error);
      throw new SourceAdditionError(command.thread.id, error as Error);
    }
  }
}
