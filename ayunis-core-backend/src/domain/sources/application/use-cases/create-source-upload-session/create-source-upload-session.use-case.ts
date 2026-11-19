import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { randomUUID } from 'crypto';
import sourceUploadConfig from 'src/config/source-upload.config';
import transcriptionConfig from 'src/config/transcription.config';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  detectFileType,
  getCanonicalMimeType,
  isAudioFile,
  SUPPORTED_AUDIO_FILE_TYPES,
  SUPPORTED_FILE_TYPES,
} from 'src/common/util/file-type';
import {
  isDocumentPipelineFile,
  maxSourceFileBytes,
} from 'src/domain/sources/application/util/source-file-limits.helper';
import { EmbeddingReadinessService } from 'src/domain/sources/application/services/embedding-readiness.service';
import { SourceUploadSessionRepository } from 'src/domain/sources/application/ports/source-upload-session.repository';
import {
  EmptyFileDataError,
  FileTooLargeError,
  UnexpectedSourceError,
  UnsupportedFileTypeError,
  UnsupportedSourceFileTypeError,
} from 'src/domain/sources/application/sources.errors';
import { recordSourceUploadOutcome } from 'src/domain/sources/application/util/source-upload-telemetry.helper';
import { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';
import { SourceUploadPipeline } from 'src/domain/sources/domain/upload/source-upload-pipeline.enum';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import {
  buildSourceUploadKey,
  SOURCE_UPLOAD_MULTIPART_THRESHOLD_BYTES,
  SOURCE_UPLOAD_PART_SIZE_BYTES,
  SOURCE_UPLOAD_SESSION_TTL_MS,
} from 'src/domain/sources/domain/upload/source-upload.constants';
import { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import { CreateSourceUploadSessionCommand } from './create-source-upload-session.command';

export interface CreatedSourceUpload {
  session: SourceUploadSession;
  partSizeBytes: number;
}

/**
 * Reserves a server-chosen storage key for one file after the cheap checks
 * (type, size, organisation state, embedding model) so a doomed upload is
 * rejected before any bytes move. The caller has already authorised the
 * target and checked its source capacity; a usage limit goes in `admit`.
 */
@Injectable()
export class CreateSourceUploadSessionUseCase {
  private readonly logger = new Logger(CreateSourceUploadSessionUseCase.name);

  constructor(
    private readonly sessions: SourceUploadSessionRepository,
    private readonly assertOrgActive: AssertOrgActiveUseCase,
    private readonly embeddingReadiness: EmbeddingReadinessService,
    private readonly contextService: ContextService,
    @Inject(transcriptionConfig.KEY)
    private readonly transcription: ConfigType<typeof transcriptionConfig>,
    @Inject(sourceUploadConfig.KEY)
    private readonly sourceUpload: ConfigType<typeof sourceUploadConfig>,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    command: CreateSourceUploadSessionCommand,
  ): Promise<CreatedSourceUpload> {
    const { orgId, userId } = getRequiredUserContext(this.contextService);
    const fileType = this.resolveFileType(command);
    this.assertFileSize(command);
    await this.assertOrgActive.execute({ orgId });

    const sessionId = randomUUID();
    const session = new SourceUploadSession({
      id: sessionId,
      orgId,
      userId,
      targetType: command.targetType,
      targetId: command.targetId,
      fileName: command.fileName,
      fileType,
      fileSize: command.fileSize,
      storageKey: buildSourceUploadKey(orgId, sessionId, command.fileName),
      multipart: command.fileSize > SOURCE_UPLOAD_MULTIPART_THRESHOLD_BYTES,
      expiresAt: new Date(Date.now() + SOURCE_UPLOAD_SESSION_TTL_MS),
    });

    if (session.pipeline === SourceUploadPipeline.DOCUMENT) {
      await this.embeddingReadiness.assertOrgCanEmbed(orgId);
    }

    await command.admit?.();
    await this.sessions.save(session);
    recordSourceUploadOutcome('created', session);

    this.logger.log(
      {
        uploadId: session.id,
        fileName: session.fileName,
        fileSize: session.fileSize,
        multipart: session.multipart,
      },
      'Created source upload session',
    );
    return { session, partSizeBytes: SOURCE_UPLOAD_PART_SIZE_BYTES };
  }

  private resolveFileType(command: CreateSourceUploadSessionCommand): string {
    const detected = detectFileType(command.mimeType, command.fileName);
    const recording = command.targetType === SourceUploadTargetType.RECORDING;
    const accepted = recording
      ? isAudioFile(detected)
      : isDocumentPipelineFile(detected);
    if (!accepted) {
      throw new UnsupportedFileTypeError(
        detected === 'unknown' ? command.fileName : detected,
        recording ? SUPPORTED_AUDIO_FILE_TYPES : SUPPORTED_FILE_TYPES,
      );
    }
    const canonical = getCanonicalMimeType(detected);
    if (!canonical) throw new UnsupportedSourceFileTypeError(detected);
    return canonical;
  }

  private assertFileSize(command: CreateSourceUploadSessionCommand): void {
    if (!Number.isInteger(command.fileSize) || command.fileSize <= 0) {
      throw new EmptyFileDataError(command.fileName);
    }
    const maxBytes = this.maxBytesFor(command);
    if (command.fileSize > maxBytes) {
      throw new FileTooLargeError(maxBytes);
    }
  }

  private maxBytesFor(command: CreateSourceUploadSessionCommand): number {
    return maxSourceFileBytes(
      detectFileType(command.mimeType, command.fileName),
      {
        documentMaxBytes: command.maxFileSizeBytes,
        pdfMaxBytes: this.sourceUpload.pdfMaxBytes,
        audioMaxBytes: this.transcription.maxUploadBytes,
      },
    );
  }
}
