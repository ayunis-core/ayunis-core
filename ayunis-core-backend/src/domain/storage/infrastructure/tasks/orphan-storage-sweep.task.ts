import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(OrphanStorageSweepTask.name);
  private isRunning = false;

  constructor(
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
    this.logger.log('Starting scheduled orphan storage sweep');

    try {
      const result = await this.sweepOrphanStorageUseCase.execute();
      this.logger.log('Scheduled orphan storage sweep completed', {
        ...result,
      });
    } catch (error) {
      this.logger.error('Scheduled orphan storage sweep failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.isRunning = false;
    }
  }
}
