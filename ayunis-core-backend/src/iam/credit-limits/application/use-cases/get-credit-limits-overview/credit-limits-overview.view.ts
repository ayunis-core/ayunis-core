import type { UUID } from 'crypto';

export interface UserCreditLimitOverviewItem {
  userId: UUID;
  name: string;
  email: string;
  monthlyCredits: number;
  creditsUsed: number;
}

export interface TeamCreditLimitOverviewItem {
  teamId: UUID;
  name: string;
  monthlyCredits: number;
  creditsUsed: number;
}

export interface CreditLimitsOverview {
  users: UserCreditLimitOverviewItem[];
  teams: TeamCreditLimitOverviewItem[];
}
