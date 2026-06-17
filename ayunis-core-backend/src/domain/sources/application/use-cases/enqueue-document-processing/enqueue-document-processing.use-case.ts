import { Injectable, Logger } from '@nestjs/common';
import { DocumentProcessingPort } from '../../ports/document-processing.port';
import { EnqueueDocumentProcessingCommand } from './enqueue-document-processing.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSourceError } from '../../sources.errors';

@Injectable()
export class EnqueueDocumentProcessingUseCase {
  private readonly logger = new Logger(EnqueueDocumentProcessingUseCase.name);

  constructor(
    private readonly documentProcessingPort: DocumentProcessingPort,
  ) {}

  async execute(command: EnqueueDocumentProcessingCommand): Promise<void> {
    this.logger.debug('Enqueuing document processing job', {
      sourceId: command.sourceId,
      fileName: command.fileName,
    });

    try {
      await this.documentProcessingPort.enqueue({
        sourceId: command.sourceId,
        orgId: command.orgId,
        userId: command.userId,
        minioPath: command.minioPath,
        fileName: command.fileName,
        fileType: command.fileType,
      });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error enqueuing document processing job', {
        error: error as Error,
      });
      throw new UnexpectedSourceError(
        'Error enqueuing document processing job',
        { error: error as Error },
      );
    }
  }
}
