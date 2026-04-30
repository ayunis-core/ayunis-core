import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  type EntityManager,
  type SelectQueryBuilder,
} from 'typeorm';
import { randomUUID } from 'crypto';
import {
  UsageQuotaRepositoryPort,
  CheckAndIncrementResult,
} from '../../../application/ports/usage-quota.repository.port';
import { QuotaType } from '../../../domain/quota-type.enum';
import type { PrincipalRef } from '../../../domain/principal-ref';
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

  async checkAndIncrement(
    principal: PrincipalRef,
    quotaType: QuotaType,
    windowDurationMs: number,
    limit: number,
  ): Promise<CheckAndIncrementResult> {
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(UsageQuotaRecord);
      const now = new Date();

      // INSERT ... ON CONFLICT DO NOTHING — atomic create-if-missing without
      // resetting count on concurrent requests. The partial unique indexes
      // (one per principal kind) drive conflict detection automatically when
      // no explicit target is given.
      await repo
        .createQueryBuilder()
        .insert()
        .into(UsageQuotaRecord)
        .values({
          id: randomUUID(),
          userId: principal.kind === 'user' ? principal.userId : null,
          apiKeyId: principal.kind === 'apiKey' ? principal.apiKeyId : null,
          quotaType,
          count: 0,
          windowStartAt: now,
          windowDurationMs: String(windowDurationMs),
        })
        .orIgnore()
        .execute();

      // SELECT FOR UPDATE — lock the row for the rest of the transaction.
      const record = await this.lockForPrincipal(
        manager,
        principal,
        quotaType,
      ).getOne();

      if (!record) {
        throw new Error('Failed to get or create quota record');
      }

      // Reset window if expired.
      const windowEndAt = new Date(
        record.windowStartAt.getTime() + Number(record.windowDurationMs),
      );
      if (now > windowEndAt) {
        record.windowStartAt = now;
        record.count = 0;
        record.windowDurationMs = String(windowDurationMs);
      }

      // Check limit BEFORE incrementing — prevents counter inflation on
      // rejected requests.
      if (record.count >= limit) {
        return {
          quota: UsageQuotaMapper.toDomain(record),
          exceeded: true,
        };
      }

      record.count++;
      record.updatedAt = now;
      await repo.save(record);

      return {
        quota: UsageQuotaMapper.toDomain(record),
        exceeded: false,
      };
    });
  }

  private lockForPrincipal(
    manager: EntityManager,
    principal: PrincipalRef,
    quotaType: QuotaType,
  ): SelectQueryBuilder<UsageQuotaRecord> {
    const qb = manager
      .getRepository(UsageQuotaRecord)
      .createQueryBuilder('quota')
      .setLock('pessimistic_write')
      .andWhere('quota.quotaType = :quotaType', { quotaType });

    if (principal.kind === 'user') {
      return qb
        .andWhere('quota.userId = :userId', { userId: principal.userId })
        .andWhere('quota.apiKeyId IS NULL');
    }
    return qb
      .andWhere('quota.apiKeyId = :apiKeyId', { apiKeyId: principal.apiKeyId })
      .andWhere('quota.userId IS NULL');
  }
}
