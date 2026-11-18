import { Injectable, Logger } from '@nestjs/common';
import { randomUUID, type UUID } from 'crypto';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { RecordingSummaryRepository } from 'src/domain/recordings/application/ports/recording-summary.repository';
import type { RecordingDetails } from 'src/domain/recordings/application/models/recording-details';
import {
  RecordingAudioAlreadyUploadedError,
  RecordingNotFoundError,
  UnexpectedRecordingError,
} from 'src/domain/recordings/application/recordings.errors';
import { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import { RecordingDetailsService } from 'src/domain/recordings/application/services/recording-details.service';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { CompleteSourceUploadUseCase } from 'src/domain/sources/application/use-cases/complete-source-upload/complete-source-upload.use-case';
import { CompleteSourceUploadCommand } from 'src/domain/sources/application/use-cases/complete-source-upload/complete-source-upload.command';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import { CompleteRecordingUploadCommand } from './complete-recording-upload.command';

/**
 * Finishes the direct upload of a recording's audio: the source holding the
 * original becomes the recording's audio and is queued for transcription,
 * and its summary run, billed to the uploader, waits for the transcript.
 * Safe to repeat; a second audio file for the same recording is rejected.
 */
@Injectable()
export class CompleteRecordingUploadUseCase {
  private readonly logger = new Logger(CompleteRecordingUploadUseCase.name);

  constructor(
    private readonly repository: RecordingRepository,
    private readonly access: RecordingAccessService,
    private readonly completeUpload: CompleteSourceUploadUseCase,
    private readonly details: RecordingDetailsService,
    private readonly summaries: RecordingSummaryRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(
    command: CompleteRecordingUploadCommand,
  ): Promise<RecordingDetails> {
    const { recordingId, uploadId } = command;
    this.logger.log({ recordingId, uploadId }, 'Completing recording upload');
    const { userId } = getRequiredUserContext(this.context);
    const recording = await this.repository.findById(recordingId);
    if (!recording) throw new RecordingNotFoundError(recordingId);
    await this.access.requireWrite(recording);

    await this.completeUpload.execute(
      new CompleteSourceUploadCommand({
        uploadId,
        targetType: SourceUploadTargetType.RECORDING,
        targetId: recordingId,
        attach: (sources) => this.attach(recordingId, sources, userId),
      }),
    );
    const [details] = await this.details.describe([recording]);
    return details;
  }

  // Runs in the transaction that creates the source. The row lock orders
  // concurrent completions and keeps a deleted recording from gaining audio.
  private async attach(
    recordingId: UUID,
    sources: Source[],
    uploaderId: UUID,
  ): Promise<void> {
    const recording = await this.repository.findById(recordingId, {
      lock: true,
    });
    if (!recording) throw new RecordingNotFoundError(recordingId);
    for (const source of sources) {
      if (!(await this.repository.attachAudio(recordingId, source.id))) {
        throw new RecordingAudioAlreadyUploadedError(recordingId);
      }
    }
    // Created with the audio, so the recording reads as summarizing from the
    // moment its transcript is ready.
    await this.summaries.createPending(recordingId, randomUUID(), uploaderId);
  }
}
