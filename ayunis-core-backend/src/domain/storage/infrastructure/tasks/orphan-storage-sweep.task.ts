import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SweepOrphanStorageUseCase } from '../../application/use-cases/sweep-orphan-storage/sweep-orphan-storage.use-case';

/**
 * Nightly job that purges object-storage blobs owned by orgs that no longer
 * exist — the unbounded leak left when a deferred org-deletion purge fails
 * (AYC-499). Runs at 2 AM, staggered before the 3 AM orphaned-images and 4 AM
 * retention cleanups. An in-memory lock prevents overlapping executions.
 */
@Injectable()
export class OrphanStorageSweepTask {
  private isRunning = false;

  constructor(
    @InjectPinoLogger(OrphanStorageSweepTask.name)
    private readonly logger: PinoLogger,
    private readonly sweepOrphanStorageUseCase: SweepOrphanStorageUseCase,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleSweep(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Orphan storage sweep already running, skipping this execution',
      );
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting scheduled orphan storage sweep');

    try {
      const result = await this.sweepOrphanStorageUseCase.execute();
      this.logger.info(
        {
          ...result,
        },
        'Scheduled orphan storage sweep completed',
      );
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Scheduled orphan storage sweep failed',
      );
    } finally {
      this.isRunning = false;
    }
  }
}
