import type { UUID } from 'crypto';
import type { BudgetAlertNotification } from '../../domain/budget-alert-notification.entity';

export abstract class BudgetAlertNotificationRepository {
  /**
   * All notifications already recorded for an org within the given billing
   * period, used to decide which threshold crossings still need an email.
   */
  abstract findByOrgAndPeriod(
    orgId: UUID,
    periodStart: Date,
  ): Promise<BudgetAlertNotification[]>;

  /**
   * Persist a notification marker. Idempotent: a duplicate (same org, scope,
   * target, period and threshold) is silently ignored.
   */
  abstract record(notification: BudgetAlertNotification): Promise<void>;
}
