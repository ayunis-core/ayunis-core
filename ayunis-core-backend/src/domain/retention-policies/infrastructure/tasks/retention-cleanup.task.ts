import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { checkIn } from '@appsignal/nodejs';
import { EnforceRetentionUseCase } from 'src/domain/retention-policies/application/use-cases/enforce-retention/enforce-retention.use-case';

/**
 * Nightly job that deletes conversation data past each org's retention window.
 * Runs at 4 AM, staggered after the 2 AM / 3 AM cleanups. An in-memory lock
 * prevents overlapping executions if a run ever exceeds 24h.
 */
@Injectable()
export class RetentionCleanupTask {
  private readonly logger = new Logger(RetentionCleanupTask.name);

  private isRunning = false;

  constructor(
    private readonly enforceRetentionUseCase: EnforceRetentionUseCase,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleCleanup(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Retention cleanup already running, skipping this execution',
      );
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting scheduled retention cleanup');

    try {
      await checkIn.cron('retention_cleanup', async () => {
        const result = await this.enforceRetentionUseCase.execute();
        this.logger.log(
          {
            orgsProcessed: result.orgsProcessed,
            totalDeleted: result.totalDeleted,
            totalFailed: result.totalFailed,
            dryRun: result.dryRun,
          },
          'Scheduled retention cleanup completed',
        );
      });
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Scheduled retention cleanup failed',
      );
    } finally {
      this.isRunning = false;
    }
  }
}
