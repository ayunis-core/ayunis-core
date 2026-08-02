import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TusUploadService } from '../../application/services/tus-upload.service';

/** Sweeps partial tus uploads whose expiration window has passed. */
@Injectable()
export class TusUploadCleanupTask {
  private readonly logger = new Logger(TusUploadCleanupTask.name);
  private isRunning = false;

  constructor(private readonly tusUploadService: TusUploadService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweepExpiredUploads(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    try {
      const deleted = await this.tusUploadService.cleanUpExpired();
      if (deleted > 0) {
        this.logger.log('Removed expired partial uploads', { deleted });
      }
    } catch (error) {
      this.logger.warn('Expired-upload sweep failed', {
        error: error as Error,
      });
    } finally {
      this.isRunning = false;
    }
  }
}
