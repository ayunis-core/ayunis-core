import { Injectable, Logger } from '@nestjs/common';
import { FileSource } from '../../../domain/sources/text-source.entity';
import { FileType, TextType } from '../../../domain/source-type.enum';
import { SourceStatus } from '../../../domain/source-status.enum';
import { MIME_TYPES } from 'src/common/util/file-type';
import { SourceRepository } from '../../ports/source.repository';
import {
  UnsupportedSourceFileTypeError,
  UnexpectedSourceError,
} from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { CreateProcessingSourceCommand } from './create-processing-source.command';

@Injectable()
export class CreateProcessingSourceUseCase {
  private readonly logger = new Logger(CreateProcessingSourceUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(command: CreateProcessingSourceCommand): Promise<FileSource> {
    this.logger.debug('Creating processing source', {
      fileName: command.fileName,
    });

    try {
      const source = new FileSource({
        fileType: this.getFileType(command.fileType),
        name: command.fileName,
        type: TextType.FILE,
        status: SourceStatus.PROCESSING,
        processingStartedAt: new Date(),
      });

      return (await this.sourceRepository.save(source)) as FileSource;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error creating processing source', {
        error: error as Error,
      });
      throw new UnexpectedSourceError('Error creating processing source', {
        error: error as Error,
      });
    }
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
      default:
        throw new UnsupportedSourceFileTypeError(mimeType);
    }
  }
}
