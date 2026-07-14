import { Injectable, Logger } from '@nestjs/common';
import { DocumentProcessingPort } from '../../ports/document-processing.port';
import { EnqueueDocumentProcessingCommand } from './enqueue-document-processing.command';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSourceError } from '../../sources.errors';

@Injectable()
export class EnqueueDocumentProcessingUseCase {
  private readonly logger = new Logger(EnqueueDocumentProcessingUseCase.name);

  constructor(
    private readonly documentProcessingPort: DocumentProcessingPort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: EnqueueDocumentProcessingCommand): Promise<void> {
    this.logger.debug('Enqueuing document processing job', {
      sourceId: command.sourceId,
      fileName: command.fileName,
    });

    await this.documentProcessingPort.enqueue({
      sourceId: command.sourceId,
      orgId: command.orgId,
      userId: command.userId,
      minioPath: command.minioPath,
      fileName: command.fileName,
      fileType: command.fileType,
    });
  }
}
