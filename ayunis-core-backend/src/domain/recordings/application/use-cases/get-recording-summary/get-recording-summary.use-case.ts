import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { RecordingSummaryRepository } from 'src/domain/recordings/application/ports/recording-summary.repository';
import {
  RecordingNotFoundError,
  RecordingSummaryNotFoundError,
  UnexpectedRecordingError,
} from 'src/domain/recordings/application/recordings.errors';
import { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import { RecordingSummaryStatus } from 'src/domain/recordings/domain/recording-summary-status.enum';
import type { RecordingSummary } from 'src/domain/recordings/domain/recording-summary.entity';
import { GetRecordingSummaryQuery } from './get-recording-summary.query';

/** A recording's generated summary, for those who may read the recording. */
@Injectable()
export class GetRecordingSummaryUseCase {
  private readonly logger = new Logger(GetRecordingSummaryUseCase.name);

  constructor(
    private readonly recordings: RecordingRepository,
    private readonly summaries: RecordingSummaryRepository,
    private readonly access: RecordingAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(query: GetRecordingSummaryQuery): Promise<RecordingSummary> {
    this.logger.log(
      { recordingId: query.recordingId },
      'Reading recording summary',
    );
    const recording = await this.recordings.findById(query.recordingId);
    if (!recording) throw new RecordingNotFoundError(query.recordingId);
    await this.access.requireRead(recording);
    const summary = await this.summaries.findByRecordingId(recording.id);
    if (summary?.status !== RecordingSummaryStatus.READY) {
      throw new RecordingSummaryNotFoundError(recording.id);
    }
    return summary;
  }
}
