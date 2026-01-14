import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UUID } from 'crypto';
import { UsageQuotaRepositoryPort } from '../../../application/ports/usage-quota.repository.port';
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
}
