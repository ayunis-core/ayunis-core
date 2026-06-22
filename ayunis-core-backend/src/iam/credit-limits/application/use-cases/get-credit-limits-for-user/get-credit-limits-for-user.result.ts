import type { UUID } from 'crypto';

export interface TeamCreditLimit {
  teamId: UUID;
  monthlyCredits: number;
}

export interface CreditLimitsForUser {
  userLimit: number | null;
  teamLimits: TeamCreditLimit[];
}
