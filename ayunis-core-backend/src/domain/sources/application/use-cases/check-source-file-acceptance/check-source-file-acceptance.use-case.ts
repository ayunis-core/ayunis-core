import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import sourceUploadConfig from 'src/config/source-upload.config';
import transcriptionConfig from 'src/config/transcription.config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { detectFileType } from 'src/common/util/file-type';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { SourceFileRejection } from 'src/domain/sources/application/models/source-file-rejection';
import {
  isDocumentPipelineFile,
  maxSourceFileBytes,
} from 'src/domain/sources/application/util/source-file-limits.helper';
import { CheckSourceFileAcceptanceQuery } from './check-source-file-acceptance.query';

/**
 * Whether a file that never passes the upload checks, such as a synced one,
 * would pass them: the same types and the same size limits. `null` when it
 * would.
 */
@Injectable()
export class CheckSourceFileAcceptanceUseCase {
  constructor(
    @Inject(transcriptionConfig.KEY)
    private readonly transcription: ConfigType<typeof transcriptionConfig>,
    @Inject(sourceUploadConfig.KEY)
    private readonly sourceUpload: ConfigType<typeof sourceUploadConfig>,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  execute(
    query: CheckSourceFileAcceptanceQuery,
  ): Promise<SourceFileRejection | null> {
    const detected = detectFileType('', query.fileName);
    if (!isDocumentPipelineFile(detected))
      return Promise.resolve(SourceFileRejection.UNSUPPORTED_TYPE);
    const maxBytes = maxSourceFileBytes(detected, {
      documentMaxBytes: query.maxFileSizeBytes,
      pdfMaxBytes: this.sourceUpload.pdfMaxBytes,
      audioMaxBytes: this.transcription.maxUploadBytes,
    });
    return Promise.resolve(
      query.size > maxBytes ? SourceFileRejection.TOO_LARGE : null,
    );
  }
}
