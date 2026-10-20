import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { checkIn } from '@appsignal/nodejs';
import { FynnReconciliationLock } from 'src/integrations/fynn/application/ports/fynn-reconciliation-lock';
import { ReconcileFynnSubscriptionsUseCase } from 'src/integrations/fynn/application/use-cases/reconcile-fynn-subscriptions/reconcile-fynn-subscriptions.use-case';

@Injectable()
export class FynnReconciliationTask {
  private readonly logger = new Logger(FynnReconciliationTask.name);
  constructor(
    private readonly config: ConfigService,
    private readonly lock: FynnReconciliationLock,
    private readonly reconcile: ReconcileFynnSubscriptionsUseCase,
  ) {}

  @Cron('0 5 0 * * *', { timeZone: 'Europe/Berlin' })
  async handleReconciliation(): Promise<void> {
    if (
      !this.config.get<boolean>('app.isCloudHosted') ||
      !this.config.get<boolean>('features.fynnManagedSubscriptionsEnabled')
    )
      return;
    try {
      const acquired = await this.lock.runIfAvailable(async () => {
        await checkIn.cron('fynn_reconciliation', async () => {
          const result = await this.reconcile.execute();
          if (result.failed > 0)
            throw new Error(
              `Fynn reconciliation failed for ${result.failed} organizations`,
            );
        });
      });
      if (!acquired)
        this.logger.log('Fynn reconciliation is running on another replica');
    } catch (error) {
      this.logger.error({ err: error }, 'Scheduled Fynn reconciliation failed');
    }
  }
}
