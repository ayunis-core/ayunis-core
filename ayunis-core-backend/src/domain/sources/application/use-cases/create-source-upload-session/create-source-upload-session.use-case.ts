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
  isCSVFile,
  isDocumentSourceFile,
  isSpreadsheetFile,
  SUPPORTED_AUDIO_FILE_TYPES,
  SUPPORTED_FILE_TYPES,
} from 'src/common/util/file-type';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { GetPermittedEmbeddingModelQuery } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.query';
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
 * target and checked its source capacity.
 */
@Injectable()
export class CreateSourceUploadSessionUseCase {
  private readonly logger = new Logger(CreateSourceUploadSessionUseCase.name);

  constructor(
    private readonly sessions: SourceUploadSessionRepository,
    private readonly assertOrgActive: AssertOrgActiveUseCase,
    private readonly getPermittedEmbeddingModel: GetPermittedEmbeddingModelUseCase,
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

    // Indexing resolves the embedding model only inside the worker, after the
    // expensive extraction — reject an unprovisioned org before the transfer.
    if (session.pipeline === SourceUploadPipeline.DOCUMENT) {
      await this.getPermittedEmbeddingModel.execute(
        new GetPermittedEmbeddingModelQuery({ orgId }),
      );
    }

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
    const isTable = isCSVFile(detected) || isSpreadsheetFile(detected);
    const accepted = recording
      ? isAudioFile(detected)
      : isDocumentSourceFile(detected) || isTable;
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

  // Two types do not follow the document limit the target passes in.
  // Recordings (AUDIO_MAX_UPLOAD_BYTES) are sent to the transcription provider
  // whole, so their cap follows what one request may carry. PDFs
  // (PDF_MAX_UPLOAD_BYTES) are processed from disk, so their size no longer
  // drives memory use (AYC-1729).
  private maxBytesFor(command: CreateSourceUploadSessionCommand): number {
    const detected = detectFileType(command.mimeType, command.fileName);
    if (isAudioFile(detected)) return this.transcription.maxUploadBytes;
    if (detected === 'pdf') return this.sourceUpload.pdfMaxBytes;
    return command.maxFileSizeBytes;
  }
}
