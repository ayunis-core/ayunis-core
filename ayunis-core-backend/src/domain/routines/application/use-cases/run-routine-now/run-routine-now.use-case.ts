import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { RoutineExecutionQueue } from 'src/domain/routines/application/ports/routine-execution-queue.port';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import {
  RoutineNotFoundError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { RunRoutineNowCommand } from './run-routine-now.command';

/** Runs regardless of `enabled`, which only governs the daily schedule. */
@Injectable()
export class RunRoutineNowUseCase {
  private readonly logger = new Logger(RunRoutineNowUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly routineExecutionQueue: RoutineExecutionQueue,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(command: RunRoutineNowCommand): Promise<void> {
    this.logger.log({ routineId: command.id }, 'Running routine now');
    const { userId } = getRequiredUserContext(this.contextService);
    const routine = await this.routinesRepository.findById(userId, command.id);
    if (!routine) throw new RoutineNotFoundError(command.id);

    // Queued before the job exists: the worker's status writes must come
    // after this one, or a fast run would end up shown as queued. A run
    // already queued or running keeps its status; the enqueue below is then
    // deduplicated into it.
    const marked = await this.routinesRepository.markRunQueued(routine.id);
    try {
      await this.routineExecutionQueue.enqueueRunNow({
        routineId: routine.id,
        userId: routine.userId,
        orgId: routine.orgId,
      });
    } catch (error) {
      if (marked) {
        await this.routinesRepository.setRunStatus(
          routine.id,
          routine.lastRunStatus,
        );
      }
      throw error;
    }
  }
}
