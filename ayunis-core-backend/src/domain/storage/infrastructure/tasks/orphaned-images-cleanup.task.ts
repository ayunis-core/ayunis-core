import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CleanupOrphanedImagesUseCase } from '../../application/use-cases/cleanup-orphaned-images/cleanup-orphaned-images.use-case';

/**
 * Scheduled task that runs daily to clean up orphaned images from storage.
 * Orphaned images are those that exist in storage but have no corresponding
 * message in the database (e.g., from failed transactions that weren't fully rolled back).
 */
@Injectable()
export class OrphanedImagesCleanupTask {
  private readonly logger = new Logger(OrphanedImagesCleanupTask.name);
  private isRunning = false;

  constructor(
    private readonly cleanupOrphanedImagesUseCase: CleanupOrphanedImagesUseCase,
  ) {}

  /**
   * Runs daily at 3 AM to clean up orphaned images.
   * Uses a lock to prevent overlapping executions.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Cleanup task already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting scheduled orphaned images cleanup');

    try {
      const result = await this.cleanupOrphanedImagesUseCase.execute();

      this.logger.log('Scheduled cleanup completed', {
        scanned: result.scannedCount,
        deleted: result.deletedCount,
        failed: result.failedCount,
      });

      if (result.failedCount > 0) {
        this.logger.warn('Some images failed to delete', {
          errors: result.errors,
        });
      }
    } catch (error) {
      this.logger.error('Scheduled cleanup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.isRunning = false;
    }
  }
}
