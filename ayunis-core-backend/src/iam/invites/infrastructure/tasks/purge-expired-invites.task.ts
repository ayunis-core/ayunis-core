import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PurgeExpiredInvitesUseCase } from '../../application/use-cases/purge-expired-invites/purge-expired-invites.use-case';

/**
 * Nightly job that purges expired, unaccepted invites past their grace period.
 * Runs at 1 AM, ahead of the other nightly cleanups. An in-memory lock
 * prevents overlapping executions if a run ever exceeds 24h.
 */
@Injectable()
export class PurgeExpiredInvitesTask {
  private readonly logger = new Logger(PurgeExpiredInvitesTask.name);
  private isRunning = false;

  constructor(
    private readonly purgeExpiredInvitesUseCase: PurgeExpiredInvitesUseCase,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handlePurge(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Expired invite purge already running, skipping this execution',
      );
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting scheduled expired invite purge');

    try {
      const result = await this.purgeExpiredInvitesUseCase.execute();
      this.logger.log('Scheduled expired invite purge completed', {
        deletedCount: result.deletedCount,
        matchedCount: result.matchedCount,
        cutoff: result.cutoff,
        dryRun: result.dryRun,
      });
    } catch (error) {
      this.logger.error(
        'Scheduled expired invite purge failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
