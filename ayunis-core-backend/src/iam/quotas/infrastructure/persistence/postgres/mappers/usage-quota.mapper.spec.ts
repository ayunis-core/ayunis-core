import type { UUID } from 'crypto';
import { UsageQuota } from '../../../../domain/usage-quota.entity';
import { QuotaType } from '../../../../domain/quota-type.enum';
import { UsageQuotaRecord } from '../schema/usage-quota.record';
import { UsageQuotaMapper } from './usage-quota.mapper';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const API_KEY_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const QUOTA_ID = '33333333-3333-4333-8333-333333333333' as UUID;

describe('UsageQuotaMapper', () => {
  it('maps a user-anchored quota to a record with userId set and apiKeyId null', () => {
    const quota = new UsageQuota({
      id: QUOTA_ID,
      principal: { kind: 'user', userId: USER_ID },
      quotaType: QuotaType.FAIR_USE_MESSAGES_MEDIUM,
      count: 7,
      windowDurationMs: 60_000,
    });

    const record = UsageQuotaMapper.toRecord(quota);

    expect(record.userId).toBe(USER_ID);
    expect(record.apiKeyId).toBeNull();
    expect(record.count).toBe(7);
  });

  it('maps an api-key-anchored quota to a record with apiKeyId set and userId null', () => {
    const quota = new UsageQuota({
      id: QUOTA_ID,
      principal: { kind: 'apiKey', apiKeyId: API_KEY_ID },
      quotaType: QuotaType.FAIR_USE_MESSAGES_HIGH,
      count: 3,
      windowDurationMs: 60_000,
    });

    const record = UsageQuotaMapper.toRecord(quota);

    expect(record.apiKeyId).toBe(API_KEY_ID);
    expect(record.userId).toBeNull();
    expect(record.quotaType).toBe(QuotaType.FAIR_USE_MESSAGES_HIGH);
  });

  it('round-trips a user-anchored row back to a domain entity with the same principal', () => {
    const record = recordWith({ userId: USER_ID, apiKeyId: null });

    const quota = UsageQuotaMapper.toDomain(record);

    expect(quota.principal).toEqual({ kind: 'user', userId: USER_ID });
  });

  it('round-trips an api-key-anchored row back to a domain entity with the same principal', () => {
    const record = recordWith({ userId: null, apiKeyId: API_KEY_ID });

    const quota = UsageQuotaMapper.toDomain(record);

    expect(quota.principal).toEqual({ kind: 'apiKey', apiKeyId: API_KEY_ID });
  });

  it('throws when a row has neither anchor (defensive against DB CHECK bypass)', () => {
    const record = recordWith({ userId: null, apiKeyId: null });

    expect(() => UsageQuotaMapper.toDomain(record)).toThrow(
      /neither userId nor apiKeyId/,
    );
  });
});

function recordWith(params: {
  userId: UUID | null;
  apiKeyId: UUID | null;
}): UsageQuotaRecord {
  const record = new UsageQuotaRecord();
  record.id = QUOTA_ID;
  record.userId = params.userId;
  record.apiKeyId = params.apiKeyId;
  record.quotaType = QuotaType.FAIR_USE_MESSAGES_MEDIUM;
  record.count = 1;
  record.windowStartAt = new Date('2026-01-01T00:00:00Z');
  record.windowDurationMs = '60000';
  record.createdAt = new Date('2026-01-01T00:00:00Z');
  record.updatedAt = new Date('2026-01-01T00:00:00Z');
  return record;
}
