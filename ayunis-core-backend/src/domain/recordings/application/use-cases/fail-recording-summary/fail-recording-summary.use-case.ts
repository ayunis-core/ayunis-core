import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RecordingSummaryRepository } from 'src/domain/recordings/application/ports/recording-summary.repository';
import { UnexpectedRecordingError } from 'src/domain/recordings/application/recordings.errors';
import { FailRecordingSummaryCommand } from './fail-recording-summary.command';
import { recordingSummaryFailureOf } from './recording-summary-failure-of';

/**
 * Ends a run that will not be attempted again with the reason of its last
 * error. The recording and its transcript stay; managers can try again.
 */
@Injectable()
export class FailRecordingSummaryUseCase {
  private readonly logger = new Logger(FailRecordingSummaryUseCase.name);

  constructor(private readonly summaries: RecordingSummaryRepository) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(command: FailRecordingSummaryCommand): Promise<void> {
    const failure = recordingSummaryFailureOf(command.error);
    this.logger.log(
      { recordingId: command.recordingId, runId: command.runId, failure },
      'Recording summary failed',
    );
    await this.summaries.markFailed(
      command.recordingId,
      command.runId,
      failure,
    );
  }
}
