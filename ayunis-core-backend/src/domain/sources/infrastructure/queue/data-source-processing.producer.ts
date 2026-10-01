import { Transactional } from '@nestjs-cls/transactional';
import { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  DataSourceProcessingPort,
  type DataSourceProcessingJobData,
} from 'src/domain/sources/application/ports/data-source-processing.port';
import { DATA_SOURCE_PROCESSING_QUEUE } from './data-source-processing.constants';
import { STANDARD_JOB_OPTIONS } from './bullmq-job.helpers';

@Injectable()
export class DataSourceProcessingProducer extends DataSourceProcessingPort {
  private readonly logger = new Logger(DataSourceProcessingProducer.name);

  constructor(
    private readonly orgAccess: AssertOrgActiveUseCase,
    @InjectQueue(DATA_SOURCE_PROCESSING_QUEUE)
    private readonly queue: Queue<DataSourceProcessingJobData>,
  ) {
    super();
  }

  @Transactional()
  async enqueue(data: DataSourceProcessingJobData): Promise<void> {
    await this.orgAccess.execute({ orgId: data.orgId, lockForLifecycle: true });
    this.logger.log(
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
