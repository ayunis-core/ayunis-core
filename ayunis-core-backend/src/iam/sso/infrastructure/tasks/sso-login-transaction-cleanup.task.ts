import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SsoLoginTransactionsRepository } from 'src/iam/sso/application/ports/sso-login-transactions.repository';

@Injectable()
export class SsoLoginTransactionCleanupTask {
  private readonly logger = new Logger(SsoLoginTransactionCleanupTask.name);

  constructor(private readonly transactions: SsoLoginTransactionsRepository) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCleanup(): Promise<void> {
    try {
      const deleted = await this.transactions.deleteExpired(new Date());
      this.logger.log({ deleted }, 'Expired SSO login transactions deleted');
    } catch (error) {
      this.logger.error({ err: error }, 'SSO login transaction cleanup failed');
    }
  }
}
