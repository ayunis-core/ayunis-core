import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { ContextService } from 'src/common/context/services/context.service';
import { FeatureFlag } from 'src/config/features.config';
import type { RoutineExecutionJobData } from 'src/domain/routines/application/ports/routine-execution-queue.port';
import { ExecuteRoutineUseCase } from 'src/domain/routines/application/use-cases/execute-routine/execute-routine.use-case';
import { ExecuteRoutineCommand } from 'src/domain/routines/application/use-cases/execute-routine/execute-routine.command';
import { observeJob } from 'src/domain/sources/infrastructure/queue/job-telemetry';
import { ROUTINE_EXECUTION_QUEUE } from './routine-execution.constants';

const DEFAULT_CONCURRENCY = 2;

/**
 * Starts only when routines are enabled: an instance with the flag off takes
 * no jobs, so they wait for an instance that may run them instead of being
 * dropped. A stalled job (its worker died) is delivered again: it runs if its
 * run had not started, and is skipped otherwise (the run is claimed per job),
 * in which case the sweep later records the run left running as interrupted.
 */
@Processor(ROUTINE_EXECUTION_QUEUE, { autorun: false })
export class RoutineExecutionConsumer
  extends WorkerHost
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(RoutineExecutionConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly executeRoutineUseCase: ExecuteRoutineUseCase,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  onApplicationBootstrap(): void {
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Routines}`)) {
      this.logger.log('Routines are disabled, not processing routine runs');
      return;
    }
    // Set here because the decorator's options are fixed before config loads.
    this.worker.concurrency = this.configService.get<number>(
      'routines.workerConcurrency',
      DEFAULT_CONCURRENCY,
    );
    this.worker.run().catch((error: unknown) => {
      this.logger.error(
        { err: error as Error },
        'Routine execution worker stopped',
      );
    });
  }

  async process(job: Job<RoutineExecutionJobData>): Promise<void> {
    await observeJob(job, () =>
      this.contextService.run(() =>
        this.executeRoutineUseCase.execute(
          new ExecuteRoutineCommand(
            job.data.routineId,
            job.data.trigger,
            // BullMQ assigns every added job an id.
            job.id as string,
          ),
        ),
      ),
    );
  }
}
