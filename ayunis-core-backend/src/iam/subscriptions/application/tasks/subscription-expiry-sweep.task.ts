import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { checkIn } from '@appsignal/nodejs';
import { ProcessExpiredSubscriptionsUseCase } from 'src/iam/subscriptions/application/use-cases/process-expired-subscriptions/process-expired-subscriptions.use-case';

// Access is cut at the boundary by every reader on its own; this sweep only
// tells the listeners (webhooks, credit limits) that a fixed term ran out,
// which a cancellation announces at once but a silent expiry never would.
@Injectable()
export class SubscriptionExpirySweepTask {
  private readonly logger = new Logger(SubscriptionExpirySweepTask.name);

  constructor(
    private readonly processExpiredSubscriptionsUseCase: ProcessExpiredSubscriptionsUseCase,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleDailySweep(): Promise<void> {
    this.logger.log('Running daily subscription expiry sweep');
    try {
      await checkIn.cron('subscription_expiry_sweep', async () => {
        await this.processExpiredSubscriptionsUseCase.execute();
      });
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Daily subscription expiry sweep failed',
      );
    }
  }
}
