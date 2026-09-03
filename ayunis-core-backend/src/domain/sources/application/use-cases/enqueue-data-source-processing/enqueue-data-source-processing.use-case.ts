import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DataSourceProcessingPort } from 'src/domain/sources/application/ports/data-source-processing.port';
import { EnqueueDataSourceProcessingCommand } from './enqueue-data-source-processing.command';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';

@Injectable()
export class EnqueueDataSourceProcessingUseCase {
  private readonly logger = new Logger(EnqueueDataSourceProcessingUseCase.name);

  constructor(
    private readonly dataSourceProcessingPort: DataSourceProcessingPort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: EnqueueDataSourceProcessingCommand): Promise<void> {
    this.logger.debug(
      {
        fileName: command.fileName,
        targetCount: command.targets.length,
      },
      'Enqueuing data source processing job',
    );

    await this.dataSourceProcessingPort.enqueue({
      uploadId: command.uploadId,
      orgId: command.orgId,
      userId: command.userId,
      minioPath: command.minioPath,
      fileName: command.fileName,
      kind: command.kind,
      targets: command.targets,
    });
  }
}
