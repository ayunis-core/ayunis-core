import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import {
  RecordingNotFoundError,
  UnexpectedRecordingError,
} from 'src/domain/recordings/application/recordings.errors';
import { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import { GetSourceTranscriptSegmentsQuery } from 'src/domain/sources/application/use-cases/get-source-transcript-segments/get-source-transcript-segments.query';
import { GetSourceTranscriptSegmentsUseCase } from 'src/domain/sources/application/use-cases/get-source-transcript-segments/get-source-transcript-segments.use-case';
import {
  toTranscriptTurns,
  type TranscriptTurn,
} from 'src/domain/transcriptions/domain/transcript-turns';
import { GetRecordingTranscriptQuery } from './get-recording-transcript.query';

/** The recording's transcript as speaker turns; empty until it is transcribed. */
@Injectable()
export class GetRecordingTranscriptUseCase {
  private readonly logger = new Logger(GetRecordingTranscriptUseCase.name);

  constructor(
    private readonly repository: RecordingRepository,
    private readonly access: RecordingAccessService,
    private readonly getSegments: GetSourceTranscriptSegmentsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(query: GetRecordingTranscriptQuery): Promise<TranscriptTurn[]> {
    const { recordingId } = query;
    this.logger.log({ recordingId }, 'Reading recording transcript');
    const recording = await this.repository.findById(recordingId);
    if (!recording) throw new RecordingNotFoundError(recordingId);
    await this.access.requireRead(recording);
    const audio = (await this.repository.findAudio([recordingId])).get(
      recordingId,
    );
    if (!audio) return [];
    const segments = await this.getSegments.execute(
      new GetSourceTranscriptSegmentsQuery(audio.sourceId),
    );
    return toTranscriptTurns(segments);
  }
}
