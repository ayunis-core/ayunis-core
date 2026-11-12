import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import transcriptionConfig from 'src/config/transcription.config';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import {
  RecordingAudioAlreadyUploadedError,
  RecordingNotFoundError,
  UnexpectedRecordingError,
} from 'src/domain/recordings/application/recordings.errors';
import { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import {
  type CreatedSourceUpload,
  CreateSourceUploadSessionUseCase,
} from 'src/domain/sources/application/use-cases/create-source-upload-session/create-source-upload-session.use-case';
import { CreateSourceUploadSessionCommand } from 'src/domain/sources/application/use-cases/create-source-upload-session/create-source-upload-session.command';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import { CheckQuotaQuery } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.query';
import { CheckQuotaUseCase } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.use-case';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';
import { CreateRecordingUploadCommand } from './create-recording-upload.command';

/**
 * Reserves the direct upload of a recording's audio. Only audio up to
 * AUDIO_MAX_UPLOAD_BYTES is accepted, and only while the recording has none,
 * so a doomed file is rejected before any bytes move. Every upload that
 * passes those checks counts against the uploader's recording fair-use
 * limit, even if it is never completed.
 */
@Injectable()
export class CreateRecordingUploadUseCase {
  private readonly logger = new Logger(CreateRecordingUploadUseCase.name);

  constructor(
    private readonly repository: RecordingRepository,
    private readonly access: RecordingAccessService,
    private readonly createSession: CreateSourceUploadSessionUseCase,
    private readonly checkQuota: CheckQuotaUseCase,
    private readonly contextService: ContextService,
    @Inject(transcriptionConfig.KEY)
    private readonly transcription: ConfigType<typeof transcriptionConfig>,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(
    command: CreateRecordingUploadCommand,
  ): Promise<CreatedSourceUpload> {
    const { recordingId } = command;
    const { userId, orgId } = getRequiredUserContext(this.contextService);
    this.logger.log({ recordingId }, 'Creating recording upload');
    const recording = await this.repository.findById(recordingId);
    if (!recording) throw new RecordingNotFoundError(recordingId);
    await this.access.requireWrite(recording);
    const audio = await this.repository.findAudio([recordingId]);
    if (audio.has(recordingId)) {
      throw new RecordingAudioAlreadyUploadedError(recordingId);
    }
    return this.createSession.execute(
      new CreateSourceUploadSessionCommand({
        targetType: SourceUploadTargetType.RECORDING,
        targetId: recordingId,
        fileName: command.fileName,
        mimeType: command.mimeType,
        fileSize: command.fileSize,
        maxFileSizeBytes: this.transcription.maxUploadBytes,
        admit: () =>
          this.checkQuota.execute(
            new CheckQuotaQuery(userId, orgId, QuotaType.FAIR_USE_RECORDINGS),
          ),
      }),
    );
  }
}
