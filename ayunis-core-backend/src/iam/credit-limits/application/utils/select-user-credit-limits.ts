import type { UUID } from 'crypto';
import type { CreditLimit } from '../../domain/credit-limit.entity';
import { isUserScoped } from './credit-limit-target.guards';

export interface UserCreditLimit {
  userId: UUID;
  monthlyCredits: number;
}

export function selectUserCreditLimits(
  limits: CreditLimit[],
): UserCreditLimit[] {
  return limits.filter(isUserScoped).map((limit) => ({
    userId: limit.target.userId,
    monthlyCredits: limit.monthlyCredits,
  }));
}
