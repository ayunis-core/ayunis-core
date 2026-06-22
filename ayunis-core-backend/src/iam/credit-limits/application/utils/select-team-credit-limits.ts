import type { UUID } from 'crypto';
import type { CreditLimit } from '../../domain/credit-limit.entity';
import { isTeamScoped } from './credit-limit-target.guards';

export interface TeamCreditLimit {
  teamId: UUID;
  monthlyCredits: number;
}

export function selectTeamCreditLimits(
  limits: CreditLimit[],
): TeamCreditLimit[] {
  return limits.filter(isTeamScoped).map((limit) => ({
    teamId: limit.target.teamId,
    monthlyCredits: limit.monthlyCredits,
  }));
}
