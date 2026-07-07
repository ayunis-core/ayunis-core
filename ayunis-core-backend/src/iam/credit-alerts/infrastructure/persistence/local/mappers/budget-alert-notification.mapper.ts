import { Injectable } from '@nestjs/common';
import { BudgetAlertNotification } from '../../../../domain/budget-alert-notification.entity';
import { BudgetAlertNotificationRecord } from '../schema/budget-alert-notification.record';

@Injectable()
export class BudgetAlertNotificationMapper {
  toRecord(
    notification: BudgetAlertNotification,
  ): BudgetAlertNotificationRecord {
    const record = new BudgetAlertNotificationRecord();
    record.id = notification.id;
    record.orgId = notification.orgId;
    record.scope = notification.scope;
    record.targetId = notification.targetId;
    record.threshold = notification.threshold;
    record.periodStart = notification.periodStart;
    record.createdAt = notification.createdAt;
    record.updatedAt = notification.updatedAt;
    return record;
  }

  toDomain(record: BudgetAlertNotificationRecord): BudgetAlertNotification {
    return new BudgetAlertNotification({
      id: record.id,
      orgId: record.orgId,
      scope: record.scope,
      targetId: record.targetId,
      threshold: record.threshold,
      periodStart: record.periodStart,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
