import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomUUID, UUID } from 'crypto';
import {
  UsageQuotaRepositoryPort,
  CheckAndIncrementResult,
} from '../../../application/ports/usage-quota.repository.port';
import { UsageQuota } from '../../../domain/usage-quota.entity';
import { QuotaType } from '../../../domain/quota-type.enum';
import { UsageQuotaRecord } from './schema/usage-quota.record';
import { UsageQuotaMapper } from './mappers/usage-quota.mapper';

@Injectable()
export class UsageQuotaRepository extends UsageQuotaRepositoryPort {
  constructor(
    @InjectRepository(UsageQuotaRecord)
    private readonly repository: Repository<UsageQuotaRecord>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async incrementAndGet(
    userId: UUID,
    quotaType: QuotaType,
    windowDurationMs: number,
  ): Promise<UsageQuota> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(UsageQuotaRecord);

      // Use SELECT FOR UPDATE to lock the row
      let record = await repo
        .createQueryBuilder('quota')
        .setLock('pessimistic_write')
        .where('quota.userId = :userId', { userId })
        .andWhere('quota.quotaType = :quotaType', { quotaType })
        .getOne();

      const now = new Date();

      if (!record) {
        // Create new quota record
        const newQuota = new UsageQuota({
          userId,
          quotaType,
          count: 1,
          windowStartAt: now,
          windowDurationMs,
        });
        record = UsageQuotaMapper.toRecord(newQuota);
        await repo.save(record);
        return newQuota;
      }

      // Check if window has expired
      const windowEndAt = new Date(
        record.windowStartAt.getTime() + Number(record.windowDurationMs),
      );

      if (now > windowEndAt) {
        // Reset window
        record.windowStartAt = now;
        record.count = 1;
        record.windowDurationMs = String(windowDurationMs);
      } else {
        // Increment counter
        record.count++;
      }

      record.updatedAt = now;
      await repo.save(record);

      return UsageQuotaMapper.toDomain(record);
    });
  }

  async checkAndIncrement(
    userId: UUID,
    quotaType: QuotaType,
    windowDurationMs: number,
    limit: number,
  ): Promise<CheckAndIncrementResult> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(UsageQuotaRecord);
      const now = new Date();

      // Use INSERT ... ON CONFLICT DO NOTHING to handle race condition on first insert
      // This atomically creates a record if it doesn't exist, without updating
      // an existing row (which would reset the count in concurrent scenarios)
      await repo
        .createQueryBuilder()
        .insert()
        .into(UsageQuotaRecord)
        .values({
          id: randomUUID(),
          userId,
          quotaType,
          count: 0, // Start at 0, we'll increment conditionally below
          windowStartAt: now,
          windowDurationMs: String(windowDurationMs),
        })
        .orIgnore() // ON CONFLICT DO NOTHING - prevents resetting count on concurrent requests
        .execute();

      // Now SELECT FOR UPDATE to lock the row for the remainder of this transaction
      const record = await repo
        .createQueryBuilder('quota')
        .setLock('pessimistic_write')
        .where('quota.userId = :userId', { userId })
        .andWhere('quota.quotaType = :quotaType', { quotaType })
        .getOne();

      if (!record) {
        // This should never happen after upsert, but handle defensively
        throw new Error('Failed to get or create quota record');
      }

      // Check if window has expired and reset if needed
      const windowEndAt = new Date(
        record.windowStartAt.getTime() + Number(record.windowDurationMs),
      );

      if (now > windowEndAt) {
        // Reset window
        record.windowStartAt = now;
        record.count = 0;
        record.windowDurationMs = String(windowDurationMs);
      }

      // Check limit BEFORE incrementing - this is the key fix
      // If at or over limit, return exceeded WITHOUT incrementing
      if (record.count >= limit) {
        return {
          quota: UsageQuotaMapper.toDomain(record),
          exceeded: true,
        };
      }

      // Under limit - increment and save
      record.count++;
      record.updatedAt = now;
      await repo.save(record);

      return {
        quota: UsageQuotaMapper.toDomain(record),
        exceeded: false,
      };
    });
  }
}
