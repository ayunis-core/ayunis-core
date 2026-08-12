import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SsoLoginTransactionsRepository } from 'src/iam/sso/application/ports/sso-login-transactions.repository';

@Injectable()
export class SsoLoginTransactionCleanupTask {
  private readonly logger = new Logger(SsoLoginTransactionCleanupTask.name);

  constructor(private readonly transactions: SsoLoginTransactionsRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async handleCleanup(): Promise<void> {
    try {
      const deleted = await this.transactions.deleteExpired(new Date());
      this.logger.log('Expired SSO login transactions deleted', { deleted });
    } catch (error) {
      this.logger.error(
        'SSO login transaction cleanup failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
