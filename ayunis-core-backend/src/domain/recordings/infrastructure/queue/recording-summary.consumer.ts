import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { ContextService } from 'src/common/context/services/context.service';
import { FeatureFlag } from 'src/config/features.config';
import type { RecordingSummaryJobData } from 'src/domain/recordings/application/ports/recording-summary-queue.port';
import { FailRecordingSummaryCommand } from 'src/domain/recordings/application/use-cases/fail-recording-summary/fail-recording-summary.command';
import { FailRecordingSummaryUseCase } from 'src/domain/recordings/application/use-cases/fail-recording-summary/fail-recording-summary.use-case';
import { GenerateRecordingSummaryCommand } from 'src/domain/recordings/application/use-cases/generate-recording-summary/generate-recording-summary.command';
import { GenerateRecordingSummaryUseCase } from 'src/domain/recordings/application/use-cases/generate-recording-summary/generate-recording-summary.use-case';
import {
  classifyJobFailure,
  isExpectedFailure,
  type JobFailureOutcome,
} from 'src/domain/sources/infrastructure/queue/bullmq-job.helpers';
import {
  observeJob,
  recordJobFailure,
} from 'src/domain/sources/infrastructure/queue/job-telemetry';
import { RECORDING_SUMMARY_QUEUE } from './recording-summary.constants';

const DEFAULT_CONCURRENCY = 2;

/**
 * Generates recording summaries on their own queue, so they never hold up
 * document processing. Starts only when recordings are enabled: an instance
 * with the flag off takes no jobs, so they wait for one that may run them.
 * Each job acts as the user its run is billed to.
 */
@Processor(RECORDING_SUMMARY_QUEUE, { autorun: false })
export class RecordingSummaryConsumer
  extends WorkerHost
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(RecordingSummaryConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly generateSummary: GenerateRecordingSummaryUseCase,
    private readonly failSummary: FailRecordingSummaryUseCase,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  onApplicationBootstrap(): void {
    if (
      !this.configService.get<boolean>(`features.${FeatureFlag.Recordings}`)
    ) {
      this.logger.log('Recordings are disabled, not summarizing recordings');
      return;
    }
    // Set here because the decorator's options are fixed before config loads.
    this.worker.concurrency = this.configService.get<number>(
      'recordings.summaryConcurrency',
      DEFAULT_CONCURRENCY,
    );
    this.worker.run().catch((error: unknown) => {
      this.logger.error(
        { err: error as Error },
        'Recording summary worker stopped',
      );
    });
  }

  async process(job: Job<RecordingSummaryJobData>): Promise<void> {
    const { recordingId, runId, orgId, userId } = job.data;
    await observeJob(job, () =>
      this.contextService.run(async () => {
        this.contextService.set('orgId', orgId);
        this.contextService.set('userId', userId);
        try {
          await this.generateSummary.execute(
            new GenerateRecordingSummaryCommand(recordingId, runId, userId),
          );
        } catch (error) {
          const { final, rethrow } = summaryJobFailure(job, error);
          if (final) {
            await this.failSummary.execute(
              new FailRecordingSummaryCommand(recordingId, runId, error),
            );
          }
          if (rethrow) throw rethrow;
        }
      }),
    );
  }
}

/**
 * Expected failures (no model, budget or credit limit reached, transcript
 * too long) settle the run at once: retrying within seconds would not change
 * them, and the user can try again. Everything else is retried like document
 * processing.
 */
function summaryJobFailure(job: Job, error: unknown): JobFailureOutcome {
  if (!isExpectedFailure(error)) return classifyJobFailure(job, error);
  recordJobFailure(job, true);
  return { final: true, rethrow: null };
}
