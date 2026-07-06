import type { UUID } from 'crypto';

export interface UserCreditLimitOverviewItem {
  userId: UUID;
  name: string;
  email: string;
  monthlyCredits: number;
  creditsUsed: number;
}
