import { UsageQuota } from '../../../../domain/usage-quota.entity';
import { UsageQuotaRecord } from '../schema/usage-quota.record';

export class UsageQuotaMapper {
  static toDomain(record: UsageQuotaRecord): UsageQuota {
    return new UsageQuota({
      id: record.id,
      userId: record.userId,
      quotaType: record.quotaType,
      count: record.count,
      windowStartAt: record.windowStartAt,
      windowDurationMs: Number(record.windowDurationMs),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(entity: UsageQuota): UsageQuotaRecord {
    const record = new UsageQuotaRecord();
    record.id = entity.id;
    record.userId = entity.userId;
    record.quotaType = entity.quotaType;
    record.count = entity.count;
    record.windowStartAt = entity.windowStartAt;
    record.windowDurationMs = String(entity.windowDurationMs);
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }
}
