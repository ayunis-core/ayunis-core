import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  private isRunning = false;

  constructor(
    @InjectPinoLogger(SessionsCleanupTask.name)
    private readonly logger: PinoLogger,
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
    this.logger.info('Starting scheduled sessions cleanup');

    try {
      const deleted = await this.refreshTokensRepository.deleteExpired(
        new Date(),
      );
      this.logger.info({ deleted }, 'Scheduled sessions cleanup completed');
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Scheduled sessions cleanup failed',
      );
    } finally {
      this.isRunning = false;
    }
  }
}
