import { checkIn } from '@appsignal/nodejs';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MonthlyCreditsSnapshotEvent } from 'src/domain/usage/application/events/monthly-credits-snapshot.event';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import { CreditReconciliationLock } from 'src/domain/usage/application/ports/credit-reconciliation-lock.port';

interface MonthPeriod {
  start: Date;
  end: Date;
}

@Injectable()
export class MonthlyCreditsReconciliationTask {
  private readonly logger = new Logger(MonthlyCreditsReconciliationTask.name);

  constructor(
    private readonly usageRepository: UsageRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly reconciliationLock: CreditReconciliationLock,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleDailyReconciliation(): Promise<void> {
    this.logger.log('Running daily monthly credit reconciliation');
    try {
      const acquired = await this.reconciliationLock.runExclusive(() =>
        checkIn.cron('monthly_credits_reconciliation', () =>
          this.reconcilePeriods(reconciliationPeriods(new Date())),
        ),
      );
      if (!acquired) {
        this.logger.warn('Credit reconciliation already running elsewhere');
      }
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Daily monthly credit reconciliation failed',
      );
    }
  }

  private async reconcilePeriods(periods: MonthPeriod[]): Promise<void> {
    let failedDeliveries = 0;
    for (const period of periods) {
      failedDeliveries += await this.reconcilePeriod(period);
    }
    if (failedDeliveries > 0) {
      const suffix = failedDeliveries === 1 ? '' : 's';
      throw new Error(
        `${failedDeliveries} monthly credit snapshot delivery${suffix} failed`,
      );
    }
  }

  private async reconcilePeriod(period: MonthPeriod): Promise<number> {
    const totals = await this.usageRepository.getCreditTotalsByOrganization(
      period.start,
      period.end,
    );
    let failedDeliveries = 0;
    for (const total of totals) {
      try {
        await this.eventEmitter.emitAsync(
          MonthlyCreditsSnapshotEvent.EVENT_NAME,
          new MonthlyCreditsSnapshotEvent({
            ...total,
            periodStart: period.start,
            periodEnd: period.end,
          }),
        );
      } catch (error) {
        failedDeliveries += 1;
        this.logger.error(
          { organizationId: total.organizationId, err: error as Error },
          'Monthly credit snapshot delivery failed',
        );
      }
    }
    return failedDeliveries;
  }
}

export function reconciliationPeriods(now: Date): MonthPeriod[] {
  const currentStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const settledEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
  );
  const previousStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const previousEnd = settledEnd < currentStart ? settledEnd : currentStart;
  const periods: MonthPeriod[] = [];
  if (previousEnd > previousStart) {
    periods.push({ start: previousStart, end: previousEnd });
  }
  if (settledEnd > currentStart) {
    periods.push({ start: currentStart, end: settledEnd });
  }
  return periods;
}
