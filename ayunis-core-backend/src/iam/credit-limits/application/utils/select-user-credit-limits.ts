import type { UUID } from 'crypto';
import type { UserCreditLimit } from '../../domain/user-credit-limit.entity';

export interface UserCreditAllowance {
  userId: UUID;
  monthlyCredits: number;
}

export function selectUserCreditLimits(
  limits: UserCreditLimit[],
): UserCreditAllowance[] {
  return limits.map((limit) => ({
    userId: limit.userId,
    monthlyCredits: limit.monthlyCredits,
  }));
}
