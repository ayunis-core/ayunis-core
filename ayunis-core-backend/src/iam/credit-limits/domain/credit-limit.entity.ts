import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { CreditLimitScope } from './value-objects/credit-limit-scope.enum';

export interface CreditLimitParams {
  id?: UUID;
  orgId: UUID;
  scope: CreditLimitScope;
  targetUserId?: UUID | null;
  targetTeamId?: UUID | null;
  monthlyCredits: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A monthly credit allowance for one user or one team. Presence of a row = a
 * cap; absence = unlimited (within the org budget); `monthlyCredits === 0`
 * freezes the principal. Exactly one of `targetUserId`/`targetTeamId` is set —
 * use the `forUser` / `forTeam` factories to keep scope and target in sync.
 */
export class CreditLimit {
  public readonly id: UUID;
  public readonly orgId: UUID;
  public readonly scope: CreditLimitScope;
  public readonly targetUserId: UUID | null;
  public readonly targetTeamId: UUID | null;
  public readonly monthlyCredits: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: CreditLimitParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.scope = params.scope;
    this.targetUserId = params.targetUserId ?? null;
    this.targetTeamId = params.targetTeamId ?? null;
    this.monthlyCredits = params.monthlyCredits;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  static forUser(
    orgId: UUID,
    targetUserId: UUID,
    monthlyCredits: number,
  ): CreditLimit {
    return new CreditLimit({
      orgId,
      scope: CreditLimitScope.USER,
      targetUserId,
      targetTeamId: null,
      monthlyCredits,
    });
  }

  static forTeam(
    orgId: UUID,
    targetTeamId: UUID,
    monthlyCredits: number,
  ): CreditLimit {
    return new CreditLimit({
      orgId,
      scope: CreditLimitScope.TEAM,
      targetUserId: null,
      targetTeamId,
      monthlyCredits,
    });
  }
}
