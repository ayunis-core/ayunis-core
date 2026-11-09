import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { randomUUID } from 'crypto';
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
import { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';
import { SourceUploadPipeline } from 'src/domain/sources/domain/upload/source-upload-pipeline.enum';
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
    const isTable = isCSVFile(detected) || isSpreadsheetFile(detected);
    if (!isDocumentSourceFile(detected) && !isTable) {
      throw new UnsupportedFileTypeError(
        detected === 'unknown' ? command.fileName : detected,
        SUPPORTED_FILE_TYPES,
      );
    }
    const canonical = getCanonicalMimeType(detected);
    if (!canonical) throw new UnsupportedSourceFileTypeError(detected);
    return canonical;
  }

  // Recordings have their own cap (AUDIO_MAX_UPLOAD_BYTES): they are sent to
  // the transcription provider whole, so the cap follows what one request may
  // carry, not the document limit the target passes in.
  private assertFileSize(command: CreateSourceUploadSessionCommand): void {
    if (!Number.isInteger(command.fileSize) || command.fileSize <= 0) {
      throw new EmptyFileDataError(command.fileName);
    }
    const detected = detectFileType(command.mimeType, command.fileName);
    const maxBytes = isAudioFile(detected)
      ? this.transcription.maxUploadBytes
      : command.maxFileSizeBytes;
    if (command.fileSize > maxBytes) {
      throw new FileTooLargeError(maxBytes);
    }
  }
}
