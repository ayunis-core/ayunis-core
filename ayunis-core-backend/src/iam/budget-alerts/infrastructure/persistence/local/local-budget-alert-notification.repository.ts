import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm';
import type { UUID } from 'crypto';
import { BudgetAlertNotificationRepository } from '../../../application/ports/budget-alert-notification.repository';
import { BudgetAlertNotification } from '../../../domain/budget-alert-notification.entity';
import {
  BudgetAlertNotificationRecord,
  OrgBudgetAlertNotificationRecord,
  TeamBudgetAlertNotificationRecord,
  UserBudgetAlertNotificationRecord,
} from './schema/budget-alert-notification.record';
import { BudgetAlertNotificationMapper } from './mappers/budget-alert-notification.mapper';

@Injectable()
export class LocalBudgetAlertNotificationRepository extends BudgetAlertNotificationRepository {
  constructor(
    @InjectRepository(BudgetAlertNotificationRecord)
    private readonly repository: Repository<BudgetAlertNotificationRecord>,
    private readonly mapper: BudgetAlertNotificationMapper,
  ) {
    super();
  }

  async findByOrgAndPeriod(
    orgId: UUID,
    periodStart: Date,
  ): Promise<BudgetAlertNotification[]> {
    const records = await this.repository.find({
      where: { orgId, periodStart },
    });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async recordMany(notifications: BudgetAlertNotification[]): Promise<void> {
    if (notifications.length === 0) {
      return;
    }

    const records = notifications.map((notification) =>
      this.mapper.toRecord(notification),
    );

    const orgRecords = records.filter(
      (record): record is OrgBudgetAlertNotificationRecord =>
        record instanceof OrgBudgetAlertNotificationRecord,
    );
    const userRecords = records.filter(
      (record): record is UserBudgetAlertNotificationRecord =>
        record instanceof UserBudgetAlertNotificationRecord,
    );
    const teamRecords = records.filter(
      (record): record is TeamBudgetAlertNotificationRecord =>
        record instanceof TeamBudgetAlertNotificationRecord,
    );

    // Each child repository supplies the correct STI discriminator. The
    // transaction keeps mixed batches atomic, while ON CONFLICT DO NOTHING
    // makes concurrent/duplicate writes idempotent.
    await this.repository.manager.transaction(async (manager) => {
      await this.insertBatch(
        manager.getRepository(OrgBudgetAlertNotificationRecord),
        orgRecords,
      );
      await this.insertBatch(
        manager.getRepository(UserBudgetAlertNotificationRecord),
        userRecords,
      );
      await this.insertBatch(
        manager.getRepository(TeamBudgetAlertNotificationRecord),
        teamRecords,
      );
    });
  }

  async deleteBefore(cutoff: Date): Promise<number> {
    const result = await this.repository.delete({
      periodStart: LessThan(cutoff),
    });
    return result.affected ?? 0;
  }

  private async insertBatch<T extends BudgetAlertNotificationRecord>(
    repository: Repository<T>,
    records: T[],
  ): Promise<void> {
    if (records.length === 0) {
      return;
    }

    await repository
      .createQueryBuilder()
      .insert()
      .values(records as QueryDeepPartialEntity<T>[])
      .orIgnore()
      .execute();
  }
}
