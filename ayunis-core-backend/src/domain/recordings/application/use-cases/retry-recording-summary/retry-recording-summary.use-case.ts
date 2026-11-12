import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { RecordingSummaryRepository } from 'src/domain/recordings/application/ports/recording-summary.repository';
import {
  RecordingNotFoundError,
  RecordingSummaryNotRetryableError,
  UnexpectedRecordingError,
} from 'src/domain/recordings/application/recordings.errors';
import { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import { RecordingSummaryScheduler } from 'src/domain/recordings/application/services/recording-summary-scheduler.service';
import { RetryRecordingSummaryCommand } from './retry-recording-summary.command';

/**
 * "Try again" on a failed summary: a new run, billed to the user who asked.
 * Asking again while that run is queued or running starts nothing; a
 * generated summary is never replaced. It does not count towards the
 * recording upload limit.
 */
@Injectable()
export class RetryRecordingSummaryUseCase {
  private readonly logger = new Logger(RetryRecordingSummaryUseCase.name);

  constructor(
    private readonly recordings: RecordingRepository,
    private readonly summaries: RecordingSummaryRepository,
    private readonly access: RecordingAccessService,
    private readonly scheduler: RecordingSummaryScheduler,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(command: RetryRecordingSummaryCommand): Promise<void> {
    this.logger.log(
      { recordingId: command.recordingId },
      'Retrying recording summary',
    );
    const { userId } = getRequiredUserContext(this.context);
    const recording = await this.recordings.findById(command.recordingId);
    if (!recording) throw new RecordingNotFoundError(command.recordingId);
    await this.access.requireWrite(recording);

    const restarted = await this.summaries.restartFailed(
      recording.id,
      randomUUID(),
      userId,
    );
    if (restarted) {
      await this.scheduler.schedule(restarted, recording.orgId, userId);
      return;
    }
    const current = await this.summaries.findByRecordingId(recording.id);
    if (!current?.isInProgress) {
      throw new RecordingSummaryNotRetryableError(recording.id);
    }
  }
}
