import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokensRepository } from '../../application/ports/refresh-tokens.repository';

/**
 * Nightly job that deletes expired refresh tokens. Runs at 5 AM. Deletes
 * strictly by expiry: used/rotated rows keep their original future expiry (so
 * nothing inside a grace window is ever swept), and revoked rows survive until
 * expiry (so continued replay of a stolen token keeps mapping to "revoked
 * family" rather than degrading to an anonymous "unknown token").
 */
@Injectable()
export class SessionsCleanupTask {
  private readonly logger = new Logger(SessionsCleanupTask.name);
  private isRunning = false;

  constructor(
    private readonly refreshTokensRepository: RefreshTokensRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async handleCleanup(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Sessions cleanup already running, skipping this execution',
      );
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting scheduled sessions cleanup');

    try {
      const deleted = await this.refreshTokensRepository.deleteExpired(
        new Date(),
      );
      this.logger.log('Scheduled sessions cleanup completed', { deleted });
    } catch (error) {
      this.logger.error(
        'Scheduled sessions cleanup failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
