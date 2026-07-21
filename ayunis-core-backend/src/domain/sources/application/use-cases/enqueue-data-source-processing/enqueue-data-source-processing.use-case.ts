import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DataSourceProcessingPort } from '../../ports/data-source-processing.port';
import { EnqueueDataSourceProcessingCommand } from './enqueue-data-source-processing.command';
import { UnexpectedSourceError } from '../../sources.errors';

@Injectable()
export class EnqueueDataSourceProcessingUseCase {
  private readonly logger = new Logger(EnqueueDataSourceProcessingUseCase.name);

  constructor(
    private readonly dataSourceProcessingPort: DataSourceProcessingPort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: EnqueueDataSourceProcessingCommand): Promise<void> {
    this.logger.debug('Enqueuing data source processing job', {
      fileName: command.fileName,
      targetCount: command.targets.length,
    });

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
