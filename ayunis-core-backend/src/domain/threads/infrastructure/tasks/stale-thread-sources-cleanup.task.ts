import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CleanupStaleThreadSourcesUseCase } from '../../application/use-cases/cleanup-stale-thread-sources/cleanup-stale-thread-sources.use-case';

@Injectable()
export class StaleThreadSourcesCleanupTask {
  private readonly logger = new Logger(StaleThreadSourcesCleanupTask.name);
  private isRunning = false;

  constructor(
    private readonly cleanupStaleThreadSourcesUseCase: CleanupStaleThreadSourcesUseCase,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCleanup(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Cleanup task already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting scheduled stale thread sources cleanup');

    try {
      const result = await this.cleanupStaleThreadSourcesUseCase.execute();
      this.logger.log('Scheduled cleanup completed', {
        scanned: result.scannedCount,
        unreferenced: result.unreferencedCount,
        deleted: result.deletedCount,
        failed: result.failedCount,
      });
      if (result.failedCount > 0) {
        this.logger.warn('Some sources failed to delete', {
          errors: result.errors,
        });
      }
    } catch (error) {
      this.logger.error(
        'Scheduled cleanup failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
