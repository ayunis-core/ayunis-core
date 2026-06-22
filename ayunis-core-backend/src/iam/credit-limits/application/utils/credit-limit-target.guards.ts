import type { CreditLimit } from '../../domain/credit-limit.entity';
import type { CreditLimitTarget } from '../../domain/value-objects/credit-limit-target';
import { CreditLimitScope } from '../../domain/value-objects/credit-limit-scope.enum';

export type UserScopedCreditLimit = CreditLimit & {
  target: Extract<CreditLimitTarget, { scope: CreditLimitScope.USER }>;
};

export type TeamScopedCreditLimit = CreditLimit & {
  target: Extract<CreditLimitTarget, { scope: CreditLimitScope.TEAM }>;
};

export function isUserScoped(
  limit: CreditLimit,
): limit is UserScopedCreditLimit {
  return limit.target.scope === CreditLimitScope.USER;
}

export function isTeamScoped(
  limit: CreditLimit,
): limit is TeamScopedCreditLimit {
  return limit.target.scope === CreditLimitScope.TEAM;
}
