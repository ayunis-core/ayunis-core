import type { TeamCreditAllowance } from '../../utils/select-team-credit-limits';

export interface CreditLimitsForUser {
  personalCreditLimit: number | null;
  teamCreditLimits: TeamCreditAllowance[];
}
