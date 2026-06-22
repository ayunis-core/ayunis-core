import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { CreditLimitTarget } from './value-objects/credit-limit-target';

export interface CreditLimitParams {
  id?: UUID;
  orgId: UUID;
  target: CreditLimitTarget;
  monthlyCredits: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A monthly credit allowance for one user or one team. Presence of a row = a
 * cap; absence = unlimited (within the org budget); `monthlyCredits === 0`
 * freezes the principal. The target (user vs team) is a discriminated union,
 * so an invalid "both / neither" state is unrepresentable.
 */
export class CreditLimit {
  public readonly id: UUID;
  public readonly orgId: UUID;
  public readonly target: CreditLimitTarget;
  public readonly monthlyCredits: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: CreditLimitParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.target = params.target;
    this.monthlyCredits = params.monthlyCredits;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
