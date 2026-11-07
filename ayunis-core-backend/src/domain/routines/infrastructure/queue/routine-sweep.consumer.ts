import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import { ContextService } from 'src/common/context/services/context.service';
import { FeatureFlag } from 'src/config/features.config';
import { SweepDueRoutinesUseCase } from 'src/domain/routines/application/use-cases/sweep-due-routines/sweep-due-routines.use-case';
import { SweepDueRoutinesCommand } from 'src/domain/routines/application/use-cases/sweep-due-routines/sweep-due-routines.command';
import { observeJob } from 'src/domain/sources/infrastructure/queue/job-telemetry';
import {
  ROUTINE_SWEEP_INTERVAL_MS,
  ROUTINE_SWEEP_JOB,
  ROUTINE_SWEEP_QUEUE,
  ROUTINE_SWEEP_SCHEDULER_ID,
} from './routine-sweep.constants';

/**
 * The daily schedule. A BullMQ job scheduler adds one sweep job per interval
 * for all replicas together (upserting it from every instance is
 * idempotent), and one worker takes each job. A separate queue keeps sweeps
 * from waiting behind long routine runs. Registered and started only when
 * routines are enabled, so with the flag off nothing is swept.
 */
@Processor(ROUTINE_SWEEP_QUEUE, { autorun: false })
export class RoutineSweepConsumer
  extends WorkerHost
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(RoutineSweepConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly sweepDueRoutinesUseCase: SweepDueRoutinesUseCase,
    @InjectQueue(ROUTINE_SWEEP_QUEUE) private readonly queue: Queue,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  onApplicationBootstrap(): void {
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Routines}`)) {
      this.logger.log('Routines are disabled, not sweeping due routines');
      return;
    }
    // Not awaited: an unreachable Redis must not block the boot.
    this.queue
      .upsertJobScheduler(
        ROUTINE_SWEEP_SCHEDULER_ID,
        { every: ROUTINE_SWEEP_INTERVAL_MS },
        {
          name: ROUTINE_SWEEP_JOB,
          opts: {
            attempts: 1,
            removeOnComplete: 100,
            removeOnFail: { age: 7 * 24 * 60 * 60, count: 200 },
          },
        },
      )
      .catch((error: unknown) => {
        this.logger.error(
          { err: error as Error },
          'Could not schedule the routine sweep',
        );
      });
    this.worker.run().catch((error: unknown) => {
      this.logger.error(
        { err: error as Error },
        'Routine sweep worker stopped',
      );
    });
  }

  async process(job: Job): Promise<void> {
    await observeJob(job, () =>
      this.contextService.run(() =>
        this.sweepDueRoutinesUseCase.execute(
          new SweepDueRoutinesCommand(new Date()),
        ),
      ),
    );
  }
}
