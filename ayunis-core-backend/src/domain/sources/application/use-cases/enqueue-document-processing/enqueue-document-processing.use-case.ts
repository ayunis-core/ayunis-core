import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DocumentProcessingPort } from '../../ports/document-processing.port';
import { EnqueueDocumentProcessingCommand } from './enqueue-document-processing.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSourceError } from '../../sources.errors';

@Injectable()
export class EnqueueDocumentProcessingUseCase {
  constructor(
    @InjectPinoLogger(EnqueueDocumentProcessingUseCase.name)
    private readonly logger: PinoLogger,
    private readonly documentProcessingPort: DocumentProcessingPort,
  ) {}

  async execute(command: EnqueueDocumentProcessingCommand): Promise<void> {
    this.logger.debug(
      {
        sourceId: command.sourceId,
        fileName: command.fileName,
      },
      'Enqueuing document processing job',
    );

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
      this.logger.error(
        {
          err: error as Error,
        },
        'Error enqueuing document processing job',
      );
      throw new UnexpectedSourceError(
        'Error enqueuing document processing job',
        { error: error as Error },
      );
    }
  }
}
