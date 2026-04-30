import type { UUID } from 'crypto';
import { UsageQuota } from './usage-quota.entity';
import { QuotaType } from './quota-type.enum';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const API_KEY_ID = '22222222-2222-4222-8222-222222222222' as UUID;

describe('UsageQuota', () => {
  it('accepts a user-anchored principal', () => {
    const quota = new UsageQuota({
      principal: { kind: 'user', userId: USER_ID },
      quotaType: QuotaType.FAIR_USE_MESSAGES_MEDIUM,
      windowDurationMs: 60_000,
    });

    expect(quota.principal).toEqual({ kind: 'user', userId: USER_ID });
  });

  it('accepts an api-key-anchored principal', () => {
    const quota = new UsageQuota({
      principal: { kind: 'apiKey', apiKeyId: API_KEY_ID },
      quotaType: QuotaType.FAIR_USE_MESSAGES_MEDIUM,
      windowDurationMs: 60_000,
    });

    expect(quota.principal).toEqual({ kind: 'apiKey', apiKeyId: API_KEY_ID });
  });

  it('rejects a user principal missing its userId', () => {
    expect(
      () =>
        new UsageQuota({
          // Bypass the discriminated-union narrowing the way a buggy mapper
          // could — verifies the runtime guard fires before the row reaches
          // persistence.
          principal: { kind: 'user', userId: null as unknown as UUID },
          quotaType: QuotaType.FAIR_USE_MESSAGES_MEDIUM,
          windowDurationMs: 60_000,
        }),
    ).toThrow(/userId/);
  });

  it('rejects an api-key principal missing its apiKeyId', () => {
    expect(
      () =>
        new UsageQuota({
          principal: { kind: 'apiKey', apiKeyId: null as unknown as UUID },
          quotaType: QuotaType.FAIR_USE_MESSAGES_MEDIUM,
          windowDurationMs: 60_000,
        }),
    ).toThrow(/apiKeyId/);
  });

  describe('window expiry', () => {
    it('is not expired immediately after construction', () => {
      const quota = new UsageQuota({
        principal: { kind: 'user', userId: USER_ID },
        quotaType: QuotaType.FAIR_USE_MESSAGES_MEDIUM,
        windowDurationMs: 60_000,
      });

      expect(quota.isWindowExpired()).toBe(false);
    });

    it('is expired once the window elapses', () => {
      const quota = new UsageQuota({
        principal: { kind: 'user', userId: USER_ID },
        quotaType: QuotaType.FAIR_USE_MESSAGES_MEDIUM,
        windowStartAt: new Date(Date.now() - 120_000),
        windowDurationMs: 60_000,
      });

      expect(quota.isWindowExpired()).toBe(true);
    });
  });
});
