import 'src/config/env';
import { randomUUID } from 'crypto';
import { DiscoveryModule } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  BullModule,
  Processor,
  WorkerHost,
  getQueueToken,
} from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { BaseModule } from 'src/app/base.module';
import { QueueWorkerRuntimeService } from './queue-worker-runtime.service';

const QUEUE = `shutdown-order-${randomUUID()}`;

const job = {
  started: (): void => undefined,
  finish: (): void => undefined,
  rows: undefined as unknown,
  error: undefined as unknown,
};

@Processor(QUEUE)
class DatabaseWritingConsumer extends WorkerHost {
  constructor(private readonly database: DataSource) {
    super();
  }

  async process(): Promise<void> {
    job.started();
    await new Promise<void>((resolve) => {
      job.finish = resolve;
    });
    try {
      job.rows = await this.database.query('SELECT 1 AS alive');
    } catch (error) {
      job.error = error;
      throw error;
    }
  }
}

describe('worker shutdown with a real database and queue', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        BaseModule.forWorker(),
        DiscoveryModule,
        BullModule.registerQueue({ name: QUEUE }),
      ],
      providers: [QueueWorkerRuntimeService, DatabaseWritingConsumer],
    }).compile();
    await app.init();
  }, 60_000);

  it('keeps the database open until a job that is still running has finished its work', async () => {
    const database = app.get(DataSource);
    const queue = app.get<Queue>(getQueueToken(QUEUE));
    await app.get(QueueWorkerRuntimeService).startHealthServer(0, [QUEUE]);
    const started = new Promise<void>((resolve) => {
      job.started = resolve;
    });
    await queue.add('write', {}, { removeOnComplete: true });
    await started;

    const closing = app.close();
    // Long enough for the shutdown to reach the database if nothing held it back.
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const openWhileJobRuns = database.isInitialized;
    job.finish();
    await closing;

    expect(openWhileJobRuns).toBe(true);
    expect(job.error).toBeUndefined();
    expect(job.rows).toEqual([{ alive: 1 }]);
    expect(database.isInitialized).toBe(false);
  }, 60_000);
});
