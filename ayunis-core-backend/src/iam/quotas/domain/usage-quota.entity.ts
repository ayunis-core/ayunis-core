import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { QuotaType } from './quota-type.enum';
import type { PrincipalRef } from './principal-ref';

export interface UsageQuotaParams {
  id?: UUID;
  principal: PrincipalRef;
  quotaType: QuotaType;
  count?: number;
  windowStartAt?: Date;
  windowDurationMs: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UsageQuota {
  public readonly id: UUID;
  public readonly principal: PrincipalRef;
  public readonly quotaType: QuotaType;
  public count: number;
  public windowStartAt: Date;
  public readonly windowDurationMs: number;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(params: UsageQuotaParams) {
    this.id = params.id ?? randomUUID();
    this.principal = assertPrincipalRef(params.principal);
    this.quotaType = params.quotaType;
    this.count = params.count ?? 0;
    this.windowStartAt = params.windowStartAt ?? new Date();
    this.windowDurationMs = params.windowDurationMs;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  isWindowExpired(): boolean {
    const windowEndAt = new Date(
      this.windowStartAt.getTime() + this.windowDurationMs,
    );
    return new Date() > windowEndAt;
  }

  resetWindow(): void {
    this.windowStartAt = new Date();
    this.count = 0;
    this.updatedAt = new Date();
  }

  increment(): void {
    this.count++;
    this.updatedAt = new Date();
  }

  getRemainingTime(): number {
    const windowEndAt = new Date(
      this.windowStartAt.getTime() + this.windowDurationMs,
    );
    return Math.max(0, windowEndAt.getTime() - Date.now());
  }
}

// Defensive value-level check — the discriminated-union type already prevents
// "both anchors set" at compile time, but mappers and tests can still produce
// half-built principal refs (e.g. `{ kind: 'user', userId: null as unknown as UUID }`).
// Mirrors the DB CHECK constraint on `usage_quotas`.
function assertPrincipalRef(principal: PrincipalRef): PrincipalRef {
  if (principal.kind === 'user' && !principal.userId) {
    throw new Error('UsageQuota principal kind=user requires a userId');
  }
  if (principal.kind === 'apiKey' && !principal.apiKeyId) {
    throw new Error('UsageQuota principal kind=apiKey requires an apiKeyId');
  }
  return principal;
}
