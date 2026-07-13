import type { UUID } from 'crypto';
import type { BudgetAlertNotification } from '../../domain/budget-alert-notification.entity';

export abstract class BudgetAlertNotificationRepository {
  abstract findByOrgAndPeriod(
    orgId: UUID,
    periodStart: Date,
  ): Promise<BudgetAlertNotification[]>;
  abstract recordMany(notifications: BudgetAlertNotification[]): Promise<void>;
  abstract deleteBefore(cutoff: Date): Promise<number>;
}
