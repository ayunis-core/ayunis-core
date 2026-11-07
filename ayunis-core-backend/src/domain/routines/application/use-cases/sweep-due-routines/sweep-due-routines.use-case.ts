import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RoutineExecutionQueue } from 'src/domain/routines/application/ports/routine-execution-queue.port';
import {
  RoutinesRepository,
  type DueRoutine,
} from 'src/domain/routines/application/ports/routines.repository';
import { UnexpectedRoutineError } from 'src/domain/routines/application/routines.errors';
import { RoutineFailureNotifier } from 'src/domain/routines/application/services/routine-failure-notifier.service';
import {
  isCatchUpDue,
  nextRoutineRunAt,
  scheduledRunKey,
} from 'src/domain/routines/domain/routine-schedule';
import { SweepDueRoutinesCommand } from './sweep-due-routines.command';

/** At most this many due routines per sweep; the rest follow a sweep later. */
const SWEEP_BATCH_SIZE = 500;
/** Beyond the run timeout, so a run that is still finishing is not failed. */
const INTERRUPTED_RUN_MARGIN_MINUTES = 5;
const INTERRUPTED_RUN_REASON = 'interrupted';

export interface SweepResult {
  started: number;
  skipped: number;
  interrupted: number;
}

/**
 * Starts the routines whose daily run is due. A run that became due earlier
 * the same Berlin day is caught up; one from an earlier day is skipped. Either
 * way the next run is scheduled first, with a conditional write, so only one
 * of several concurrent sweeps acts on a due run. Also fails runs still shown
 * as running long after the run timeout (the worker that ran them is gone)
 * and tells their owners.
 */
@Injectable()
export class SweepDueRoutinesUseCase {
  private readonly logger = new Logger(SweepDueRoutinesUseCase.name);

  constructor(
    private readonly routinesRepository: RoutinesRepository,
    private readonly routineExecutionQueue: RoutineExecutionQueue,
    private readonly configService: ConfigService,
    private readonly failureNotifier: RoutineFailureNotifier,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRoutineError)
  async execute(command: SweepDueRoutinesCommand): Promise<SweepResult> {
    const { now } = command;
    const interrupted = await this.failInterruptedRuns(now);
    const due = await this.routinesRepository.findDue(now, SWEEP_BATCH_SIZE);
    const result: SweepResult = { started: 0, skipped: 0, interrupted };
    for (const routine of due) {
      const action = await this.scheduleDueRun(routine, now);
      if (action !== 'taken') result[action]++;
    }
    if (due.length > 0 || interrupted > 0) {
      this.logger.log({ ...result, due: due.length }, 'Swept due routines');
    }
    return result;
  }

  private async scheduleDueRun(
    routine: DueRoutine,
    now: Date,
  ): Promise<'started' | 'skipped' | 'taken'> {
    const next = nextRoutineRunAt(routine, now);
    const taken = await this.routinesRepository.moveNextRunAt(
      routine.id,
      routine.nextRunAt,
      next,
    );
    if (!taken) return 'taken';
    if (!isCatchUpDue(routine.nextRunAt, now)) {
      this.logger.log(
        { routineId: routine.id, missedRunAt: routine.nextRunAt },
        'Skipping a routine run missed on an earlier day',
      );
      return 'skipped';
    }
    try {
      await this.routineExecutionQueue.enqueueScheduled(
        {
          routineId: routine.id,
          userId: routine.userId,
          orgId: routine.orgId,
        },
        scheduledRunKey(routine.nextRunAt),
      );
    } catch (error) {
      // Keeps the run due, so the next sweep starts it later today.
      await this.routinesRepository.moveNextRunAt(
        routine.id,
        next,
        routine.nextRunAt,
      );
      throw error;
    }
    return 'started';
  }

  private async failInterruptedRuns(now: Date): Promise<number> {
    const timeoutMinutes = this.configService.get<number>(
      'routines.runTimeoutMinutes',
      15,
    );
    const startedBefore = new Date(
      now.getTime() -
        (timeoutMinutes + INTERRUPTED_RUN_MARGIN_MINUTES) * 60_000,
    );
    const runs = await this.routinesRepository.failRunsStartedBefore(
      startedBefore,
      INTERRUPTED_RUN_REASON,
      now,
    );
    for (const { routine, paused } of runs) {
      await this.failureNotifier.notify({
        routine,
        failureReason: INTERRUPTED_RUN_REASON,
        paused,
        // The routine does not keep its runs' threads.
        routineThreadId: null,
      });
    }
    return runs.length;
  }
}
