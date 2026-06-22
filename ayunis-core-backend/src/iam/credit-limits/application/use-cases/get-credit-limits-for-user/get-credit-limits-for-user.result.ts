import type { TeamCreditLimit } from '../../utils/select-team-credit-limits';

export interface CreditLimitsForUser {
  personalCreditLimit: number | null;
  teamCreditLimits: TeamCreditLimit[];
}
