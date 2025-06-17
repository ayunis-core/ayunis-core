import { Injectable, Logger } from '@nestjs/common';
import { FileRetrieverResult } from '../../../domain/file-retriever-result.entity';
import { ProcessFileCommand } from './process-file.command';
import { FileRetrieverHandler } from '../../ports/file-retriever.handler';
import { File } from '../../../domain/file.entity';

@Injectable()
export class ProcessFileUseCase {
  private readonly logger = new Logger(ProcessFileUseCase.name);

  constructor(private readonly handler: FileRetrieverHandler) {}

  async execute(command: ProcessFileCommand): Promise<FileRetrieverResult> {
    this.logger.debug(`Processing file: ${command.fileName}`);

    const file = new File(command.fileData, command.fileName);
    return this.handler.processFile(file);
  }
}
