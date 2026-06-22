import type { UUID } from 'crypto';

export interface TeamCreditLimitOverviewItem {
  teamId: UUID;
  name: string;
  monthlyCredits: number;
  creditsUsed: number;
}
