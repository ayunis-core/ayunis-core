import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ThreadsRepository } from '../../ports/threads.repository';
import { AddSourceCommand } from './add-source.command';
import { SourceAdditionError } from '../../threads.errors';
import { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import {
  SourceAlreadyAssignedError,
  ThreadSourceLimitExceededError,
} from '../../threads.errors';
import { ThreadsConstants } from 'src/domain/threads/domain/threads.constants';

const PG_UNIQUE_VIOLATION = '23505';

// The duplicate check below is check-then-insert and can race with a
// concurrent add of the same source; the database unique violation is the
// authoritative signal and must map to the same 409 as the app-level check.
function isUniqueConstraintViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const record = error as Record<string, unknown>;
  const driverError = record.driverError as Record<string, unknown> | undefined;
  return (
    record.code === PG_UNIQUE_VIOLATION ||
    driverError?.code === PG_UNIQUE_VIOLATION
  );
}

@Injectable()
export class AddSourceToThreadUseCase {
  private readonly logger = new Logger(AddSourceToThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
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
      this.assertSourceCanBeAdded(currentAssignments, command.source.id);

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
      throw this.mapAddSourceError(error, command);
    }
  }

  private assertSourceCanBeAdded(
    assignments: SourceAssignment[],
    sourceId: string,
  ): void {
    const sourceExists = assignments.some(
      (assignment) => assignment.source.id === sourceId,
    );
    if (sourceExists) {
      throw new SourceAlreadyAssignedError(sourceId);
    }
    if (assignments.length >= ThreadsConstants.MAX_SOURCES) {
      throw new ThreadSourceLimitExceededError(ThreadsConstants.MAX_SOURCES);
    }
  }

  private mapAddSourceError(error: unknown, command: AddSourceCommand): Error {
    if (error instanceof ApplicationError) {
      return error;
    }
    if (isUniqueConstraintViolation(error)) {
      return new SourceAlreadyAssignedError(command.source.id);
    }
    this.logger.error('addSource', error);
    return new SourceAdditionError(command.thread.id, error as Error);
  }
}
