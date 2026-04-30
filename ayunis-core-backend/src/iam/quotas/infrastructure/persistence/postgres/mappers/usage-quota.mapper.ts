import { UsageQuota } from '../../../../domain/usage-quota.entity';
import type { PrincipalRef } from '../../../../domain/principal-ref';
import { UsageQuotaRecord } from '../schema/usage-quota.record';

export class UsageQuotaMapper {
  static toDomain(record: UsageQuotaRecord): UsageQuota {
    return new UsageQuota({
      id: record.id,
      principal: principalFromRecord(record),
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
    record.userId =
      entity.principal.kind === 'user' ? entity.principal.userId : null;
    record.apiKeyId =
      entity.principal.kind === 'apiKey' ? entity.principal.apiKeyId : null;
    record.quotaType = entity.quotaType;
    record.count = entity.count;
    record.windowStartAt = entity.windowStartAt;
    record.windowDurationMs = String(entity.windowDurationMs);
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }
}

function principalFromRecord(record: UsageQuotaRecord): PrincipalRef {
  if (record.userId) {
    return { kind: 'user', userId: record.userId };
  }
  if (record.apiKeyId) {
    return { kind: 'apiKey', apiKeyId: record.apiKeyId };
  }
  // Should be impossible thanks to the DB CHECK constraint, but the row's
  // type allows both columns to be null — fail loudly rather than silently
  // produce a malformed domain entity.
  throw new Error(
    `usage_quotas row ${record.id} has neither userId nor apiKeyId`,
  );
}
