import { Injectable, Logger } from '@nestjs/common';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { fileTypeFromMimeType } from 'src/domain/sources/application/util/source-file-type.helpers';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import {
  UnsupportedSourceFileTypeError,
  UnexpectedSourceError,
} from 'src/domain/sources/application/sources.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { CreateProcessingSourceCommand } from './create-processing-source.command';

@Injectable()
export class CreateProcessingSourceUseCase {
  private readonly logger = new Logger(CreateProcessingSourceUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: CreateProcessingSourceCommand): Promise<FileSource> {
    this.logger.debug(
      {
        fileName: command.fileName,
      },
      'Creating processing source',
    );

    const source = new FileSource({
      fileType: this.getFileType(command.fileType),
      name: command.fileName,
      type: TextType.FILE,
      status: SourceStatus.PROCESSING,
    });

    return (await this.sourceRepository.save(source)) as FileSource;
  }

  private getFileType(mimeType: string): FileType {
    const fileType = fileTypeFromMimeType(mimeType);
    if (!fileType) throw new UnsupportedSourceFileTypeError(mimeType);
    return fileType;
  }
}
