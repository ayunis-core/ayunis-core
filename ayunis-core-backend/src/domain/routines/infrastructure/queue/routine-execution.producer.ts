import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import {
  RoutineExecutionQueue,
  type RoutineExecutionJobData,
} from 'src/domain/routines/application/ports/routine-execution-queue.port';
import {
  ROUTINE_EXECUTION_QUEUE,
  RUN_NOW_JOB,
} from './routine-execution.constants';

/**
 * A single attempt: a retry would execute the routine again on the user's
 * behalf, with another thread and another round of credits. Failures are
 * recorded on the routine instead.
 */
const ROUTINE_JOB_OPTIONS: JobsOptions = {
  attempts: 1,
  removeOnComplete: 100,
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 200 },
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

  async enqueueRunNow(data: RoutineExecutionJobData): Promise<void> {
    this.logger.log({ routineId: data.routineId }, 'Enqueuing routine run');
    // Deduplicated only while the job waits or runs, so the next Run now
    // after it finished (or failed) is accepted again.
    await this.queue.add(RUN_NOW_JOB, data, {
      ...ROUTINE_JOB_OPTIONS,
      deduplication: { id: `${RUN_NOW_JOB}:${data.routineId}` },
    });
  }
}
