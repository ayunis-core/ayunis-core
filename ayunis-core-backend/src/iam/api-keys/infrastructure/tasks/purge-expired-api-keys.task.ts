import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PurgeExpiredApiKeysUseCase } from '../../application/use-cases/purge-expired-api-keys/purge-expired-api-keys.use-case';

/**
 * Nightly job that purges expired API keys past their grace period. Runs at
 * 5 AM, staggered after the other nightly cleanups. An in-memory lock prevents
 * overlapping executions if a run ever exceeds 24h.
 */
@Injectable()
export class PurgeExpiredApiKeysTask {
  private readonly logger = new Logger(PurgeExpiredApiKeysTask.name);
  private isRunning = false;

  constructor(
    private readonly purgeExpiredApiKeysUseCase: PurgeExpiredApiKeysUseCase,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async handlePurge(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Expired API key purge already running, skipping this execution',
      );
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting scheduled expired API key purge');

    try {
      const result = await this.purgeExpiredApiKeysUseCase.execute();
      this.logger.log('Scheduled expired API key purge completed', {
        deletedCount: result.deletedCount,
        matchedCount: result.matchedCount,
        cutoff: result.cutoff,
        dryRun: result.dryRun,
      });
    } catch (error) {
      this.logger.error(
        'Scheduled expired API key purge failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
