import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export interface CreditLimitParams {
  id?: UUID;
  orgId: UUID;
  monthlyCredits: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A monthly credit allowance for one principal. Presence of a row = a cap;
 * absence = unlimited within the org budget; `monthlyCredits === 0` freezes the
 * principal. One subclass per scope owns the corresponding target id.
 */
export abstract class CreditLimit {
  public readonly id: UUID;
  public readonly orgId: UUID;
  public readonly monthlyCredits: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: CreditLimitParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.monthlyCredits = params.monthlyCredits;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
