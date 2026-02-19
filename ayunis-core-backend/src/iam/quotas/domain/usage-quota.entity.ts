import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { QuotaType } from './quota-type.enum';

export interface UsageQuotaParams {
  id?: UUID;
  userId: UUID;
  quotaType: QuotaType;
  count?: number;
  windowStartAt?: Date;
  windowDurationMs: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UsageQuota {
  public readonly id: UUID;
  public readonly userId: UUID;
  public readonly quotaType: QuotaType;
  public count: number;
  public windowStartAt: Date;
  public readonly windowDurationMs: number;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(params: UsageQuotaParams) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
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
