import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { BudgetAlertNotificationRepository } from '../../../application/ports/budget-alert-notification.repository';
import { BudgetAlertNotification } from '../../../domain/budget-alert-notification.entity';
import { BudgetAlertNotificationRecord } from './schema/budget-alert-notification.record';
import { BudgetAlertNotificationMapper } from './mappers/budget-alert-notification.mapper';

@Injectable()
export class LocalBudgetAlertNotificationRepository extends BudgetAlertNotificationRepository {
  private readonly logger = new Logger(
    LocalBudgetAlertNotificationRepository.name,
  );

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

  async record(notification: BudgetAlertNotification): Promise<void> {
    const record = this.mapper.toRecord(notification);
    // Idempotent: a concurrent/duplicate run hitting the unique index is a
    // no-op (ON CONFLICT DO NOTHING) rather than an error.
    await this.repository
      .createQueryBuilder()
      .insert()
      .values(record)
      .orIgnore()
      .execute();
  }
}
