import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  DataSourceProcessingPort,
  type DataSourceProcessingJobData,
} from '../../application/ports/data-source-processing.port';
import { DATA_SOURCE_PROCESSING_QUEUE } from './data-source-processing.constants';
import { STANDARD_JOB_OPTIONS } from './bullmq-job.helpers';

@Injectable()
export class DataSourceProcessingProducer extends DataSourceProcessingPort {
  constructor(
    @InjectPinoLogger(DataSourceProcessingProducer.name)
    private readonly logger: PinoLogger,
    @InjectQueue(DATA_SOURCE_PROCESSING_QUEUE)
    private readonly queue: Queue<DataSourceProcessingJobData>,
  ) {
    super();
  }

  async enqueue(data: DataSourceProcessingJobData): Promise<void> {
    this.logger.info(
      {
        fileName: data.fileName,
        targetCount: data.targets.length,
      },
      'Enqueuing data source processing job',
    );

    await this.queue.add('process-data-source', data, {
      jobId: data.uploadId,
      ...STANDARD_JOB_OPTIONS,
    });
  }
}
