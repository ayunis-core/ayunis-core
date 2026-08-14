import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DataSourceProcessingPort } from '../../ports/data-source-processing.port';
import { EnqueueDataSourceProcessingCommand } from './enqueue-data-source-processing.command';
import { UnexpectedSourceError } from '../../sources.errors';

@Injectable()
export class EnqueueDataSourceProcessingUseCase {
  constructor(
    @InjectPinoLogger(EnqueueDataSourceProcessingUseCase.name)
    private readonly logger: PinoLogger,
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
