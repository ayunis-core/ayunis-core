import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  detectFileType,
  getCanonicalMimeType,
} from 'src/common/util/file-type';
import { SourceBatchWriteRepository } from 'src/domain/sources/application/ports/source-batch-write.repository';
import {
  UnexpectedSourceError,
  UnsupportedSourceFileTypeError,
} from 'src/domain/sources/application/sources.errors';
import { fileTypeFromMimeType } from 'src/domain/sources/application/util/source-file-type.helpers';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { FileType } from 'src/domain/sources/domain/source-type.enum';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { CreateProcessingFileSourcesCommand } from './create-processing-file-sources.command';

/**
 * Creates PROCESSING file sources in a knowledge base, typed by their names.
 * The caller holds the knowledge base's capacity lock.
 */
@Injectable()
export class CreateProcessingFileSourcesUseCase {
  private readonly logger = new Logger(CreateProcessingFileSourcesUseCase.name);

  constructor(private readonly repository: SourceBatchWriteRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    command: CreateProcessingFileSourcesCommand,
  ): Promise<FileSource[]> {
    this.logger.log(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        count: command.fileNames.length,
      },
      'Creating processing file sources',
    );
    const sources = command.fileNames.map(
      (name) =>
        new FileSource({
          name,
          fileType: this.fileTypeOf(name),
          type: TextType.FILE,
          knowledgeBaseId: command.knowledgeBaseId,
          status: SourceStatus.PROCESSING,
          // Armed once a worker picks up the file, like a crawl's root, so
          // the stale-processing cleanup leaves queued files alone.
          processingStartedAt: null,
        }),
    );
    await this.repository.insertFileSources(sources);
    return sources;
  }

  private fileTypeOf(name: string): FileType {
    const mimeType = getCanonicalMimeType(detectFileType('', name));
    const fileType = mimeType ? fileTypeFromMimeType(mimeType) : undefined;
    if (!fileType) throw new UnsupportedSourceFileTypeError(name);
    return fileType;
  }
}
