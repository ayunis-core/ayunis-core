import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FileSource } from '../../../domain/sources/text-source.entity';
import { FileType, TextType } from '../../../domain/source-type.enum';
import { SourceStatus } from '../../../domain/source-status.enum';
import { MIME_TYPES } from 'src/common/util/file-type';
import { SourceRepository } from '../../ports/source.repository';
import {
  UnsupportedSourceFileTypeError,
  UnexpectedSourceError,
} from '../../sources.errors';
import { CreateProcessingSourceCommand } from './create-processing-source.command';

@Injectable()
export class CreateProcessingSourceUseCase {
  private readonly logger = new Logger(CreateProcessingSourceUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: CreateProcessingSourceCommand): Promise<FileSource> {
    this.logger.debug('Creating processing source', {
      fileName: command.fileName,
    });

    const source = new FileSource({
      fileType: this.getFileType(command.fileType),
      name: command.fileName,
      type: TextType.FILE,
      status: SourceStatus.PROCESSING,
      processingStartedAt: new Date(),
    });

    return (await this.sourceRepository.save(source)) as FileSource;
  }

  private getFileType(mimeType: string): FileType {
    switch (mimeType) {
      case MIME_TYPES.PDF:
        return FileType.PDF;
      case MIME_TYPES.DOCX:
        return FileType.DOCX;
      case MIME_TYPES.PPTX:
        return FileType.PPTX;
      case MIME_TYPES.TXT:
        return FileType.TXT;
      case MIME_TYPES.MP3:
      case MIME_TYPES.M4A:
      case MIME_TYPES.WAV:
      case MIME_TYPES.WEBM:
        return FileType.AUDIO;
      default:
        throw new UnsupportedSourceFileTypeError(mimeType);
    }
  }
}
