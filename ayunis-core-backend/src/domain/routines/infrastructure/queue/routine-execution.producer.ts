import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JobsOptions, Queue } from 'bullmq';
import {
  RoutineExecutionQueue,
  type RoutineExecutionJobData,
  type RoutineExecutionTarget,
} from 'src/domain/routines/application/ports/routine-execution-queue.port';
import { RoutineRunTrigger } from 'src/domain/routines/domain/routine-run-trigger.enum';
import {
  ROUTINE_EXECUTION_QUEUE,
  RUN_NOW_JOB,
  SCHEDULED_RUN_JOB,
} from './routine-execution.constants';

/**
 * A Run now job gets a single attempt: its failure is recorded on the
 * routine, and the user can run it again.
 */
const ROUTINE_JOB_OPTIONS: JobsOptions = {
  attempts: 1,
  removeOnComplete: 100,
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 200 },
};

/**
 * A scheduled job is retried: the sweep has already moved `nextRunAt` on, so
 * a job that fails before its run starts (e.g. the routine cannot be loaded)
 * would otherwise lose the day's run. The worker claims each job's run once
 * (`markRunStarted` by job id), so a retry after the run started does not
 * execute the routine again.
 */
const SCHEDULED_JOB_OPTIONS: JobsOptions = {
  ...ROUTINE_JOB_OPTIONS,
  attempts: 3,
  backoff: { type: 'exponential', delay: 30_000 },
};

@Injectable()
export class RoutineExecutionProducer extends RoutineExecutionQueue {
  private readonly logger = new Logger(RoutineExecutionProducer.name);

  constructor(
    @InjectQueue(ROUTINE_EXECUTION_QUEUE)
    private readonly queue: Queue<RoutineExecutionJobData>,
  ) {
    super();
  }

  async enqueueRunNow(target: RoutineExecutionTarget): Promise<void> {
    this.logger.log({ routineId: target.routineId }, 'Enqueuing routine run');
    // Deduplicated only while the job waits or runs, so the next Run now
    // after it finished (or failed) is accepted again. The job id is the
    // worker's execution key, so it must never repeat; BullMQ's generated ids
    // restart when Redis loses its data.
    await this.queue.add(
      RUN_NOW_JOB,
      { ...target, trigger: RoutineRunTrigger.RUN_NOW },
      {
        ...ROUTINE_JOB_OPTIONS,
        jobId: `routine-${target.routineId}-run-now-${randomUUID()}`,
        deduplication: { id: `${RUN_NOW_JOB}:${target.routineId}` },
      },
    );
  }

  async enqueueScheduled(
    target: RoutineExecutionTarget,
    runKey: string,
  ): Promise<void> {
    this.logger.log(
      { routineId: target.routineId, runKey },
      'Enqueuing scheduled routine run',
    );
    // BullMQ ignores an add whose job id still exists. Custom ids must not
    // contain ":" (bullmq only tolerates it for legacy repeat ids).
    await this.queue.add(
      SCHEDULED_RUN_JOB,
      { ...target, trigger: RoutineRunTrigger.SCHEDULED },
      {
        ...SCHEDULED_JOB_OPTIONS,
        jobId: `routine-${target.routineId}-${runKey}`,
      },
    );
  }
}
