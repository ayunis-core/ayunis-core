import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
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
  constructor(
    @InjectPinoLogger(CreateProcessingSourceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly sourceRepository: SourceRepository,
  ) {}

  async execute(command: CreateProcessingSourceCommand): Promise<FileSource> {
    this.logger.debug(
      {
        fileName: command.fileName,
      },
      'Creating processing source',
    );

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
      this.logger.error(
        {
          err: error as Error,
        },
        'Error creating processing source',
      );
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
      case MIME_TYPES.EML:
        return FileType.EML;
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
