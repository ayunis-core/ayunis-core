import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RecordingSummaryRepository } from 'src/domain/recordings/application/ports/recording-summary.repository';
import { UnexpectedRecordingError } from 'src/domain/recordings/application/recordings.errors';
import { RecordingSummaryScheduler } from 'src/domain/recordings/application/services/recording-summary-scheduler.service';
import { RecordingSummaryFailure } from 'src/domain/recordings/domain/recording-summary-failure.enum';
import { StartRecordingSummaryCommand } from './start-recording-summary.command';

/**
 * Queues the job of the run that waited for the transcript, billed to the
 * uploader. When the uploader was deleted meanwhile, the run fails so that a
 * manager can try again.
 */
@Injectable()
export class StartRecordingSummaryUseCase {
  private readonly logger = new Logger(StartRecordingSummaryUseCase.name);

  constructor(
    private readonly summaries: RecordingSummaryRepository,
    private readonly scheduler: RecordingSummaryScheduler,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(command: StartRecordingSummaryCommand): Promise<void> {
    this.logger.log(
      { audioSourceId: command.audioSourceId },
      'Starting recording summary',
    );
    const summary = await this.summaries.findPendingForAudio(
      command.audioSourceId,
    );
    if (!summary) {
      this.logger.log(
        { audioSourceId: command.audioSourceId },
        'No recording summary waits for this transcript, skipping',
      );
      return;
    }
    if (!summary.triggeredByUserId) {
      await this.summaries.markFailed(
        summary.recordingId,
        summary.runId,
        RecordingSummaryFailure.SUMMARY_FAILED,
      );
      return;
    }
    await this.scheduler.schedule(
      summary,
      command.orgId,
      summary.triggeredByUserId,
    );
  }
}
