import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PasswordSetTokensRepository } from '../../application/ports/password-set-tokens.repository';

/**
 * Nightly job that deletes expired or already-used password-set tokens. Runs at
 * 5 AM, after the 2/3/4 AM cleanups. An in-memory lock prevents overlapping
 * executions.
 */
@Injectable()
export class PasswordSetTokenCleanupTask {
  private readonly logger = new Logger(PasswordSetTokenCleanupTask.name);
  private isRunning = false;

  constructor(
    private readonly passwordSetTokensRepository: PasswordSetTokensRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async handleCleanup(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Password-set-token cleanup already running, skipping this execution',
      );
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting scheduled password-set-token cleanup');

    try {
      const deleted =
        await this.passwordSetTokensRepository.deleteExpiredOrUsed(new Date());
      this.logger.log('Scheduled password-set-token cleanup completed', {
        deleted,
      });
    } catch (error) {
      this.logger.error(
        'Scheduled password-set-token cleanup failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
