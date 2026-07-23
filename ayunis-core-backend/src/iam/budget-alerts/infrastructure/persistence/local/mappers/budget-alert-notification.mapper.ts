import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  BudgetAlertNotification,
  OrgBudgetAlertNotification,
  TeamBudgetAlertNotification,
  UserBudgetAlertNotification,
} from '../../../../domain/budget-alert-notification.entity';
import {
  BudgetAlertNotificationRecord,
  OrgBudgetAlertNotificationRecord,
  TeamBudgetAlertNotificationRecord,
  UserBudgetAlertNotificationRecord,
} from '../schema/budget-alert-notification.record';

@Injectable()
export class BudgetAlertNotificationMapper {
  toRecord(
    notification: BudgetAlertNotification,
  ): BudgetAlertNotificationRecord {
    const record = this.toTargetRecord(notification);
    record.id = notification.id;
    record.orgId = notification.orgId;
    record.threshold = notification.threshold;
    record.periodStart = notification.periodStart;
    record.createdAt = notification.createdAt;
    record.updatedAt = notification.updatedAt;
    return record;
  }

  toDomain(record: BudgetAlertNotificationRecord): BudgetAlertNotification {
    if (record instanceof OrgBudgetAlertNotificationRecord) {
      return new OrgBudgetAlertNotification({
        id: record.id,
        orgId: record.orgId,
        threshold: record.threshold,
        periodStart: record.periodStart,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    if (record instanceof UserBudgetAlertNotificationRecord) {
      return new UserBudgetAlertNotification({
        id: record.id,
        orgId: record.orgId,
        userId: record.userId as UUID,
        threshold: record.threshold,
        periodStart: record.periodStart,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    if (record instanceof TeamBudgetAlertNotificationRecord) {
      return new TeamBudgetAlertNotification({
        id: record.id,
        orgId: record.orgId,
        teamId: record.teamId as UUID,
        threshold: record.threshold,
        periodStart: record.periodStart,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    throw new Error(
      `Unknown budget alert notification record type: ${record.constructor.name}`,
    );
  }

  private toTargetRecord(
    notification: BudgetAlertNotification,
  ): BudgetAlertNotificationRecord {
    if (notification instanceof OrgBudgetAlertNotification) {
      return new OrgBudgetAlertNotificationRecord();
    }

    if (notification instanceof UserBudgetAlertNotification) {
      return Object.assign(new UserBudgetAlertNotificationRecord(), {
        userId: notification.userId,
      });
    }

    if (notification instanceof TeamBudgetAlertNotification) {
      return Object.assign(new TeamBudgetAlertNotificationRecord(), {
        teamId: notification.teamId,
      });
    }

    throw new Error(
      `Unknown budget alert notification type: ${notification.constructor.name}`,
    );
  }
}
