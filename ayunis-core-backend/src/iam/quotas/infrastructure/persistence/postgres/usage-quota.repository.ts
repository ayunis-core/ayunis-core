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
    return await this.dataSource.transaction(async (manager) => {
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
        record.windowStartAt.getTime() + record.windowDurationMs,
      );

      if (now > windowEndAt) {
        // Reset window
        record.windowStartAt = now;
        record.count = 1;
        record.windowDurationMs = windowDurationMs;
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
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(UsageQuotaRecord);
      const now = new Date();

      await this.upsertEmptyQuota(
        repo,
        userId,
        quotaType,
        windowDurationMs,
        now,
      );
      const record = await this.lockQuotaRow(repo, userId, quotaType);
      resetWindowIfExpired(record, now, windowDurationMs);

      if (record.count >= limit) {
        return { quota: UsageQuotaMapper.toDomain(record), exceeded: true };
      }

      record.count++;
      record.updatedAt = now;
      await repo.save(record);

      return { quota: UsageQuotaMapper.toDomain(record), exceeded: false };
    });
  }

  // Atomically create the row if missing, without updating existing rows
  // (which would otherwise reset the count under concurrent requests).
  private async upsertEmptyQuota(
    repo: Repository<UsageQuotaRecord>,
    userId: UUID,
    quotaType: QuotaType,
    windowDurationMs: number,
    now: Date,
  ): Promise<void> {
    await repo
      .createQueryBuilder()
      .insert()
      .into(UsageQuotaRecord)
      .values({
        id: randomUUID(),
        userId,
        quotaType,
        count: 0,
        windowStartAt: now,
        windowDurationMs,
      })
      .orIgnore()
      .execute();
  }

  private async lockQuotaRow(
    repo: Repository<UsageQuotaRecord>,
    userId: UUID,
    quotaType: QuotaType,
  ): Promise<UsageQuotaRecord> {
    const record = await repo
      .createQueryBuilder('quota')
      .setLock('pessimistic_write')
      .where('quota.userId = :userId', { userId })
      .andWhere('quota.quotaType = :quotaType', { quotaType })
      .getOne();

    if (!record) {
      // Should never happen after upsert; defensive guard.
      throw new Error('Failed to get or create quota record');
    }
    return record;
  }
}

function resetWindowIfExpired(
  record: UsageQuotaRecord,
  now: Date,
  windowDurationMs: number,
): void {
  const windowEndAt = new Date(
    record.windowStartAt.getTime() + record.windowDurationMs,
  );
  if (now > windowEndAt) {
    record.windowStartAt = now;
    record.count = 0;
    record.windowDurationMs = windowDurationMs;
  }
}
