import type { UUID } from 'crypto';
import type { TeamCreditLimit } from '../../domain/team-credit-limit.entity';

export interface TeamCreditAllowance {
  teamId: UUID;
  monthlyCredits: number;
}

export function selectTeamCreditLimits(
  limits: TeamCreditLimit[],
): TeamCreditAllowance[] {
  return limits.map((limit) => ({
    teamId: limit.teamId,
    monthlyCredits: limit.monthlyCredits,
  }));
}
